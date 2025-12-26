// ============================================
// PLATFORM ORGANIZATIONS CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { platformOrgService } from "../../application/services/platform-org.service.js";
import { logPlatformAction } from "../middleware/platform-auth.middleware.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const ListOrgsQuerySchema = z.object({
	search: z.string().optional(),
	status: z.enum(["all", "active", "suspended"]).optional(),
	planId: z.string().optional(),
	hasActiveSubscription: z
		.string()
		.transform((v) => v === "true")
		.optional(),
	createdAfter: z.string().datetime().optional(),
	createdBefore: z.string().datetime().optional(),
	limit: z.string().transform(Number).optional(),
	offset: z.string().transform(Number).optional(),
	sortBy: z.enum(["createdAt", "name", "memberCount"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

const UpdateOrgSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9-]+$/)
		.optional(),
});

const SuspendOrgSchema = z.object({
	reason: z.string().min(1).max(1000),
});

const TransferOwnershipSchema = z.object({
	newOwnerId: z.string().min(1),
});

const AdjustSubscriptionSchema = z.object({
	planId: z.string().min(1),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	notes: z.string().max(1000).optional(),
});

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * List all organizations
 * GET /api/platform/organizations
 */
export async function listOrganizations(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = ListOrgsQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const filters = {
			...parseResult.data,
			createdAfter: parseResult.data.createdAfter
				? new Date(parseResult.data.createdAfter)
				: undefined,
			createdBefore: parseResult.data.createdBefore
				? new Date(parseResult.data.createdBefore)
				: undefined,
		};

		const result = await platformOrgService.listOrganizations(filters);

		res.status(200).json({
			success: true,
			data: result.organizations,
			meta: {
				total: result.total,
				limit: filters.limit ?? 50,
				offset: filters.offset ?? 0,
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get organization details
 * GET /api/platform/organizations/:id
 */
export async function getOrganization(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		const org = await platformOrgService.getOrganization(id);

		res.status(200).json({
			success: true,
			data: org,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update organization
 * PATCH /api/platform/organizations/:id
 */
export async function updateOrganization(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = UpdateOrgSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		await platformOrgService.updateOrganization(id, parseResult.data);

		await logPlatformAction(
			req,
			"update_organization",
			"organization",
			id,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: "Organization updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Suspend organization
 * POST /api/platform/organizations/:id/suspend
 */
export async function suspendOrganization(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = SuspendOrgSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		await platformOrgService.suspendOrganization(id, parseResult.data.reason);

		await logPlatformAction(req, "suspend_organization", "organization", id, {
			reason: parseResult.data.reason,
		});

		res.status(200).json({
			success: true,
			message: "Organization suspended successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Unsuspend organization
 * POST /api/platform/organizations/:id/unsuspend
 */
export async function unsuspendOrganization(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		await platformOrgService.unsuspendOrganization(id);

		await logPlatformAction(req, "unsuspend_organization", "organization", id);

		res.status(200).json({
			success: true,
			message: "Organization unsuspended successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Delete organization
 * DELETE /api/platform/organizations/:id
 */
export async function deleteOrganization(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		await platformOrgService.deleteOrganization(id);

		await logPlatformAction(req, "delete_organization", "organization", id);

		res.status(200).json({
			success: true,
			message: "Organization deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Transfer organization ownership
 * POST /api/platform/organizations/:id/transfer-ownership
 */
export async function transferOwnership(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = TransferOwnershipSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		await platformOrgService.transferOwnership(id, parseResult.data.newOwnerId);

		await logPlatformAction(req, "transfer_ownership", "organization", id, {
			newOwnerId: parseResult.data.newOwnerId,
		});

		res.status(200).json({
			success: true,
			message: "Ownership transferred successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get organization audit log
 * GET /api/platform/organizations/:id/audit-log
 */
export async function getOrgAuditLog(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const limit = req.query.limit ? Number(req.query.limit) : 50;

		const auditLog = await platformOrgService.getOrganizationAuditLog(
			id,
			limit,
		);

		res.status(200).json({
			success: true,
			data: auditLog,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Adjust organization subscription
 * POST /api/platform/organizations/:id/adjust-subscription
 */
export async function adjustSubscription(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = AdjustSubscriptionSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		await platformOrgService.adjustSubscription(id, parseResult.data.planId, {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
			notes: parseResult.data.notes,
		});

		await logPlatformAction(
			req,
			"adjust_subscription",
			"organization",
			id,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: "Subscription adjusted successfully",
		});
	} catch (error) {
		next(error);
	}
}
