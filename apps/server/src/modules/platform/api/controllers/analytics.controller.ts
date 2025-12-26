// ============================================
// PLATFORM ANALYTICS CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { platformAnalyticsService } from "../../application/services/platform-analytics.service.js";
import { logPlatformAction } from "../middleware/platform-auth.middleware.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const DateRangeQuerySchema = z.object({
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

const ExportQuerySchema = z.object({
	type: z.enum(["users", "organizations", "revenue", "usage"]),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Get platform overview metrics
 * GET /api/platform/analytics/overview
 */
export async function getOverview(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = DateRangeQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const range = {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
		};

		const metrics = await platformAnalyticsService.getOverviewMetrics(
			range.startDate && range.endDate
				? (range as { startDate: Date; endDate: Date })
				: undefined,
		);

		res.status(200).json({
			success: true,
			data: metrics,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get revenue metrics
 * GET /api/platform/analytics/revenue
 */
export async function getRevenue(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = DateRangeQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const range = {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
		};

		const metrics = await platformAnalyticsService.getRevenueMetrics(
			range.startDate && range.endDate
				? (range as { startDate: Date; endDate: Date })
				: undefined,
		);

		res.status(200).json({
			success: true,
			data: metrics,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get usage metrics
 * GET /api/platform/analytics/usage
 */
export async function getUsage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = DateRangeQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const range = {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
		};

		const metrics = await platformAnalyticsService.getUsageMetrics(
			range.startDate && range.endDate
				? (range as { startDate: Date; endDate: Date })
				: undefined,
		);

		res.status(200).json({
			success: true,
			data: metrics,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get growth metrics
 * GET /api/platform/analytics/growth
 */
export async function getGrowth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = DateRangeQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const range = {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
		};

		const metrics = await platformAnalyticsService.getGrowthMetrics(
			range.startDate && range.endDate
				? (range as { startDate: Date; endDate: Date })
				: undefined,
		);

		res.status(200).json({
			success: true,
			data: metrics,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Export analytics data
 * GET /api/platform/analytics/export
 */
export async function exportAnalytics(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = ExportQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const range = {
			startDate: parseResult.data.startDate
				? new Date(parseResult.data.startDate)
				: undefined,
			endDate: parseResult.data.endDate
				? new Date(parseResult.data.endDate)
				: undefined,
		};

		const csvData = await platformAnalyticsService.exportAnalytics(
			parseResult.data.type,
			range.startDate && range.endDate
				? (range as { startDate: Date; endDate: Date })
				: undefined,
		);

		await logPlatformAction(req, "export_analytics", "analytics", null, {
			type: parseResult.data.type,
			startDate: parseResult.data.startDate,
			endDate: parseResult.data.endDate,
		});

		res.setHeader("Content-Type", "text/csv");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${parseResult.data.type}-export-${new Date().toISOString().split("T")[0]}.csv"`,
		);
		res.status(200).send(csvData);
	} catch (error) {
		next(error);
	}
}
