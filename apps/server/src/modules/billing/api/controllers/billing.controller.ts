// ============================================
// BILLING CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import { db } from "@grandplan/db";
import { getCurrentTenant } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { subscriptionService } from "../../application/services/subscription.service.js";
import { usageService } from "../../application/services/usage.service.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const CreateCheckoutSchema = z.object({
	planId: z.string().min(1),
	billingInterval: z.enum(["monthly", "yearly"]),
	successUrl: z.string().url(),
	cancelUrl: z.string().url(),
});


// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Get current subscription
 * GET /api/billing/subscription
 */
export async function getSubscription(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const subscription = await subscriptionService.getSubscription(
			tenant.organizationId,
		);

		res.status(200).json({
			success: true,
			data: subscription,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get available plans
 * GET /api/billing/plans
 */
export async function getPlans(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const plans = await subscriptionService.getAvailablePlans();

		res.status(200).json({
			success: true,
			data: plans,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Create checkout session
 * POST /api/billing/checkout
 */
export async function createCheckout(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = CreateCheckoutSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		// Get customer email from user
		const user = await db.user.findUnique({
			where: { id: tenant.userId },
			select: { email: true },
		});

		if (!user?.email) {
			throw new ValidationError("User email is required for checkout");
		}

		const session = await subscriptionService.createCheckout({
			organizationId: tenant.organizationId,
			planId: parseResult.data.planId,
			billingInterval: parseResult.data.billingInterval,
			successUrl: parseResult.data.successUrl,
			cancelUrl: parseResult.data.cancelUrl,
			customerEmail: user.email,
		});

		res.status(200).json({
			success: true,
			data: session,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Create customer portal session
 * POST /api/billing/portal
 */
export async function createPortal(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const portal = await subscriptionService.createPortalSession(
			tenant.organizationId,
		);

		res.status(200).json({
			success: true,
			data: portal,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Cancel subscription
 * POST /api/billing/cancel
 */
export async function cancelSubscription(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();
		const { atPeriodEnd = true } = req.body;

		await subscriptionService.cancelSubscription(
			tenant.organizationId,
			atPeriodEnd,
		);

		res.status(200).json({
			success: true,
			message: atPeriodEnd
				? "Subscription will be canceled at the end of the billing period"
				: "Subscription canceled immediately",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Reactivate subscription
 * POST /api/billing/reactivate
 */
export async function reactivateSubscription(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		await subscriptionService.reactivateSubscription(tenant.organizationId);

		res.status(200).json({
			success: true,
			message: "Subscription reactivated",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get invoices
 * GET /api/billing/invoices
 */
export async function getInvoices(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();
		const { limit = "20", offset = "0" } = req.query;

		const subscription = await db.subscription.findUnique({
			where: { organizationId: tenant.organizationId },
		});

		if (!subscription) {
			res.status(200).json({
				success: true,
				data: [],
			});
			return;
		}

		const invoices = await db.invoice.findMany({
			where: { subscriptionId: subscription.id },
			orderBy: { createdAt: "desc" },
			take: Number.parseInt(limit as string),
			skip: Number.parseInt(offset as string),
			select: {
				id: true,
				amount: true,
				currency: true,
				status: true,
				periodStart: true,
				periodEnd: true,
				paidAt: true,
				invoiceUrl: true,
				pdfUrl: true,
				createdAt: true,
			},
		});

		const total = await db.invoice.count({
			where: { subscriptionId: subscription.id },
		});

		res.status(200).json({
			success: true,
			data: invoices.map((inv) => ({
				...inv,
				amount: Number(inv.amount),
			})),
			pagination: {
				total,
				limit: Number.parseInt(limit as string),
				offset: Number.parseInt(offset as string),
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get usage statistics
 * GET /api/billing/usage
 */
export async function getUsage(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const usage = await usageService.getUsageSummary(tenant.organizationId);

		res.status(200).json({
			success: true,
			data: usage,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get usage by metric
 * GET /api/billing/usage/:metric
 */
export async function getUsageByMetric(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();
		const { metric } = req.params;
		const { startDate, endDate } = req.query;

		const start = startDate
			? new Date(startDate as string)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
		const end = endDate ? new Date(endDate as string) : new Date();

		const usage = await usageService.getUsageByMetric(
			tenant.organizationId,
			metric!,
			start,
			end,
		);

		res.status(200).json({
			success: true,
			data: usage,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Check usage limits and warnings
 * GET /api/billing/limits
 */
export async function checkLimits(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const [seatsLimit, storageLimit, aiLimit, warnings] = await Promise.all([
			subscriptionService.checkLimit(tenant.organizationId, "users"),
			subscriptionService.checkLimit(tenant.organizationId, "storage"),
			subscriptionService.checkLimit(tenant.organizationId, "aiRequests"),
			usageService.checkUsageWarnings(tenant.organizationId),
		]);

		res.status(200).json({
			success: true,
			data: {
				limits: {
					seats: seatsLimit,
					storage: storageLimit,
					aiRequests: aiLimit,
				},
				warnings,
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Check if feature is available
 * GET /api/billing/features/:feature
 */
export async function checkFeature(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();
		const { feature } = req.params;

		const hasFeature = await subscriptionService.hasFeature(
			tenant.organizationId,
			feature!,
		);

		res.status(200).json({
			success: true,
			data: {
				feature,
				available: hasFeature,
			},
		});
	} catch (error) {
		next(error);
	}
}
