// ============================================
// PLATFORM PLANS CONTROLLER
// ============================================

import { NotFoundError, ValidationError } from "@grandplan/core";
import { db } from "@grandplan/db";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { logPlatformAction } from "../middleware/platform-auth.middleware.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const CreatePlanSchema = z.object({
	name: z.string().min(1).max(255),
	tier: z.enum(["free", "starter", "pro", "enterprise"]),
	price: z.number().min(0),
	interval: z.enum(["monthly", "yearly"]),
	features: z.array(z.string()),
	limits: z.record(z.string(), z.number()).optional(),
	isActive: z.boolean().optional(),
});

const UpdatePlanSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	tier: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
	price: z.number().min(0).optional(),
	interval: z.enum(["monthly", "yearly"]).optional(),
	features: z.array(z.string()).optional(),
	limits: z.record(z.string(), z.number()).optional(),
	isActive: z.boolean().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform DB plan to API response format
 */
function transformPlan(plan: {
	id: string;
	name: string;
	description: string | null;
	priceMonthly: unknown;
	priceYearly: unknown;
	features: unknown;
	isActive: boolean;
	isFree: boolean;
	isEnterprise: boolean;
	_count?: { subscriptions: number };
}) {
	// Determine tier based on flags and price
	let tier: "free" | "starter" | "pro" | "enterprise" = "starter";
	if (plan.isFree) tier = "free";
	else if (plan.isEnterprise) tier = "enterprise";
	else if (plan.priceMonthly && Number(plan.priceMonthly) >= 50) tier = "pro";

	// Get price based on what's available
	const price = plan.priceMonthly
		? Number(plan.priceMonthly)
		: plan.priceYearly
			? Number(plan.priceYearly)
			: 0;

	// Parse features from JSON
	const featuresJson = plan.features as
		| Record<string, boolean>
		| string[]
		| null;
	let features: string[] = [];
	if (Array.isArray(featuresJson)) {
		features = featuresJson;
	} else if (featuresJson && typeof featuresJson === "object") {
		features = Object.entries(featuresJson)
			.filter(([, enabled]) => enabled)
			.map(([name]) => name);
	}

	return {
		id: plan.id,
		name: plan.name,
		tier,
		price,
		interval: plan.priceMonthly ? "monthly" : "yearly",
		features,
		limits: {},
		isActive: plan.isActive,
		subscriberCount: plan._count?.subscriptions ?? 0,
	};
}

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * List all plans
 * GET /api/admin/plans
 */
export async function listPlans(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const plans = await db.plan.findMany({
			orderBy: { displayOrder: "asc" },
			include: {
				_count: {
					select: { subscriptions: true },
				},
			},
		});

		res.status(200).json({
			plans: plans.map(transformPlan),
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get a single plan
 * GET /api/admin/plans/:id
 */
export async function getPlan(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id!;

		const plan = await db.plan.findUnique({
			where: { id },
			include: {
				_count: {
					select: { subscriptions: true },
				},
			},
		});

		if (!plan) {
			throw new NotFoundError("Plan", id);
		}

		res.status(200).json(transformPlan(plan));
	} catch (error) {
		next(error);
	}
}

/**
 * Create a new plan
 * POST /api/admin/plans
 */
export async function createPlan(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = CreatePlanSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const { name, tier, price, interval, features, isActive } =
			parseResult.data;

		// Check for duplicate name
		const existing = await db.plan.findUnique({
			where: { name },
		});

		if (existing) {
			throw new ValidationError("A plan with this name already exists");
		}

		// Get max display order
		const maxOrder = await db.plan.aggregate({
			_max: { displayOrder: true },
		});

		const plan = await db.plan.create({
			data: {
				name,
				priceMonthly: interval === "monthly" ? price : null,
				priceYearly: interval === "yearly" ? price : null,
				features: features,
				isActive: isActive ?? true,
				isFree: tier === "free",
				isEnterprise: tier === "enterprise",
				displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
			},
			include: {
				_count: {
					select: { subscriptions: true },
				},
			},
		});

		await logPlatformAction(req, "create_plan", "plan", plan.id, {
			name,
			tier,
			price,
			interval,
		});

		res.status(201).json(transformPlan(plan));
	} catch (error) {
		next(error);
	}
}

/**
 * Update a plan
 * PATCH /api/admin/plans/:id
 */
export async function updatePlan(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id!;
		const parseResult = UpdatePlanSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		// Verify plan exists
		const existing = await db.plan.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new NotFoundError("Plan", id);
		}

		const { name, tier, price, interval, features, isActive } =
			parseResult.data;

		// Check for duplicate name if changing
		if (name && name !== existing.name) {
			const duplicate = await db.plan.findUnique({
				where: { name },
			});
			if (duplicate) {
				throw new ValidationError("A plan with this name already exists");
			}
		}

		// Build update data
		const updateData: Record<string, unknown> = {};

		if (name !== undefined) updateData.name = name;
		if (features !== undefined) updateData.features = features;
		if (isActive !== undefined) updateData.isActive = isActive;

		if (tier !== undefined) {
			updateData.isFree = tier === "free";
			updateData.isEnterprise = tier === "enterprise";
		}

		if (price !== undefined && interval !== undefined) {
			updateData.priceMonthly = interval === "monthly" ? price : null;
			updateData.priceYearly = interval === "yearly" ? price : null;
		} else if (price !== undefined) {
			// Update existing interval
			if (existing.priceMonthly !== null) {
				updateData.priceMonthly = price;
			} else {
				updateData.priceYearly = price;
			}
		} else if (interval !== undefined) {
			// Change interval, keep price
			const currentPrice = existing.priceMonthly ?? existing.priceYearly ?? 0;
			updateData.priceMonthly = interval === "monthly" ? currentPrice : null;
			updateData.priceYearly = interval === "yearly" ? currentPrice : null;
		}

		const plan = await db.plan.update({
			where: { id },
			data: updateData,
			include: {
				_count: {
					select: { subscriptions: true },
				},
			},
		});

		await logPlatformAction(req, "update_plan", "plan", id, parseResult.data);

		res.status(200).json(transformPlan(plan));
	} catch (error) {
		next(error);
	}
}

/**
 * Delete a plan
 * DELETE /api/admin/plans/:id
 */
export async function deletePlan(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id!;

		// Verify plan exists and check for subscribers
		const plan = await db.plan.findUnique({
			where: { id },
			include: {
				_count: {
					select: { subscriptions: true },
				},
			},
		});

		if (!plan) {
			throw new NotFoundError("Plan", id);
		}

		if (plan._count.subscriptions > 0) {
			throw new ValidationError(
				"Cannot delete a plan with active subscribers. Deactivate it instead.",
			);
		}

		await db.plan.delete({
			where: { id },
		});

		await logPlatformAction(req, "delete_plan", "plan", id, {
			name: plan.name,
		});

		res.status(200).json({
			success: true,
			message: "Plan deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}
