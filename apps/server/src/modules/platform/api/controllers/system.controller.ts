// ============================================
// PLATFORM SYSTEM CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { systemConfigService } from "../../application/services/system-config.service.js";
import { logPlatformAction } from "../middleware/platform-auth.middleware.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const UpdateSettingsSchema = z.object({
	platformName: z.string().min(1).max(255).optional(),
	platformUrl: z.string().url().optional(),
	supportEmail: z.string().email().optional(),
	maintenanceMode: z.boolean().optional(),
	maintenanceMessage: z.string().max(1000).nullable().optional(),
	registrationEnabled: z.boolean().optional(),
	inviteOnly: z.boolean().optional(),
	emailVerificationRequired: z.boolean().optional(),
	allowedDomains: z.array(z.string()).optional(),
	defaultAICreditsPerMonth: z.number().min(0).optional(),
	maxOrganizationsPerUser: z.number().min(1).optional(),
	maxMembersPerOrganization: z.number().min(1).optional(),
	maxProjectsPerOrganization: z.number().min(1).optional(),
	aiEnabled: z.boolean().optional(),
	slackIntegrationEnabled: z.boolean().optional(),
	webhooksEnabled: z.boolean().optional(),
	mfaRequired: z.boolean().optional(),
	sessionTimeoutMinutes: z.number().min(5).max(43200).optional(),
	maxLoginAttempts: z.number().min(1).max(100).optional(),
	passwordMinLength: z.number().min(6).max(128).optional(),
	passwordRequireSpecialChar: z.boolean().optional(),
});

const MaintenanceModeSchema = z.object({
	enabled: z.boolean(),
	message: z.string().min(1).max(1000).optional(),
});

const CreateFeatureFlagSchema = z.object({
	key: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9_-]+$/),
	name: z.string().min(1).max(255),
	description: z.string().max(1000).optional(),
	enabled: z.boolean().optional(),
	rolloutPercentage: z.number().min(0).max(100).optional(),
	targetOrganizations: z.array(z.string()).optional(),
	targetUsers: z.array(z.string()).optional(),
});

const UpdateFeatureFlagSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(1000).optional(),
	enabled: z.boolean().optional(),
	rolloutPercentage: z.number().min(0).max(100).optional(),
	targetOrganizations: z.array(z.string()).optional(),
	targetUsers: z.array(z.string()).optional(),
});

const CreateAnnouncementSchema = z.object({
	title: z.string().min(1).max(255),
	content: z.string().min(1).max(5000),
	type: z.enum(["info", "warning", "success", "error"]),
	targetAudience: z.enum(["all", "admins", "organizations", "users"]),
	startAt: z.string().datetime().optional(),
	endAt: z.string().datetime().nullable().optional(),
	dismissible: z.boolean().optional(),
});

const UpdateAnnouncementSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	content: z.string().min(1).max(5000).optional(),
	type: z.enum(["info", "warning", "success", "error"]).optional(),
	targetAudience: z
		.enum(["all", "admins", "organizations", "users"])
		.optional(),
	startAt: z.string().datetime().optional(),
	endAt: z.string().datetime().nullable().optional(),
	dismissible: z.boolean().optional(),
	active: z.boolean().optional(),
});

// ============================================
// SYSTEM SETTINGS
// ============================================

/**
 * Get system settings
 * GET /api/platform/system/config
 */
export async function getSettings(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const settings = await systemConfigService.getSettings();

		res.status(200).json({
			success: true,
			data: settings,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update system settings
 * PATCH /api/platform/system/config
 */
export async function updateSettings(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = UpdateSettingsSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		await systemConfigService.updateSettings(parseResult.data);

		await logPlatformAction(
			req,
			"update_settings",
			"system",
			null,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: "Settings updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Toggle maintenance mode
 * POST /api/platform/system/maintenance
 */
export async function toggleMaintenanceMode(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = MaintenanceModeSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		if (parseResult.data.enabled) {
			await systemConfigService.enableMaintenanceMode(
				parseResult.data.message ?? "System maintenance in progress",
			);
		} else {
			await systemConfigService.disableMaintenanceMode();
		}

		await logPlatformAction(
			req,
			"toggle_maintenance",
			"system",
			null,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: parseResult.data.enabled
				? "Maintenance mode enabled"
				: "Maintenance mode disabled",
		});
	} catch (error) {
		next(error);
	}
}

// ============================================
// FEATURE FLAGS
// ============================================

/**
 * List feature flags
 * GET /api/platform/system/feature-flags
 */
export async function listFeatureFlags(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const flags = await systemConfigService.listFeatureFlags();

		res.status(200).json({
			success: true,
			data: flags,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get feature flag
 * GET /api/platform/system/feature-flags/:key
 */
export async function getFeatureFlag(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { key } = req.params;

		const flag = await systemConfigService.getFeatureFlag(key!);

		res.status(200).json({
			success: true,
			data: flag,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Create feature flag
 * POST /api/platform/system/feature-flags
 */
export async function createFeatureFlag(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = CreateFeatureFlagSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const flag = await systemConfigService.createFeatureFlag(parseResult.data);

		await logPlatformAction(
			req,
			"create_feature_flag",
			"feature_flag",
			flag.id,
			parseResult.data,
		);

		res.status(201).json({
			success: true,
			data: flag,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update feature flag
 * PATCH /api/platform/system/feature-flags/:key
 */
export async function updateFeatureFlag(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { key } = req.params;
		const parseResult = UpdateFeatureFlagSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		await systemConfigService.updateFeatureFlag(key!, parseResult.data);

		await logPlatformAction(
			req,
			"update_feature_flag",
			"feature_flag",
			key!,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: "Feature flag updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Delete feature flag
 * DELETE /api/platform/system/feature-flags/:key
 */
export async function deleteFeatureFlag(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { key } = req.params;

		await systemConfigService.deleteFeatureFlag(key!);

		await logPlatformAction(req, "delete_feature_flag", "feature_flag", key!);

		res.status(200).json({
			success: true,
			message: "Feature flag deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}

// ============================================
// ANNOUNCEMENTS
// ============================================

/**
 * List announcements
 * GET /api/platform/announcements
 */
export async function listAnnouncements(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const activeOnly = req.query.activeOnly === "true";
		const limit = req.query.limit ? Number(req.query.limit) : 50;
		const offset = req.query.offset ? Number(req.query.offset) : 0;

		const result = await systemConfigService.listAnnouncements({
			activeOnly,
			limit,
			offset,
		});

		res.status(200).json({
			success: true,
			data: result.announcements,
			meta: {
				total: result.total,
				limit,
				offset,
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get announcement
 * GET /api/platform/announcements/:id
 */
export async function getAnnouncement(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		const announcement = await systemConfigService.getAnnouncement(id!);

		res.status(200).json({
			success: true,
			data: announcement,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Create announcement
 * POST /api/platform/announcements
 */
export async function createAnnouncement(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = CreateAnnouncementSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const data = {
			...parseResult.data,
			startAt: parseResult.data.startAt
				? new Date(parseResult.data.startAt)
				: undefined,
			endAt: parseResult.data.endAt ? new Date(parseResult.data.endAt) : null,
		};

		const announcement = await systemConfigService.createAnnouncement(data);

		await logPlatformAction(
			req,
			"create_announcement",
			"announcement",
			announcement.id,
			parseResult.data,
		);

		res.status(201).json({
			success: true,
			data: announcement,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update announcement
 * PATCH /api/platform/announcements/:id
 */
export async function updateAnnouncement(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = UpdateAnnouncementSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const data = {
			...parseResult.data,
			startAt: parseResult.data.startAt
				? new Date(parseResult.data.startAt)
				: undefined,
			endAt:
				parseResult.data.endAt !== undefined
					? parseResult.data.endAt
						? new Date(parseResult.data.endAt)
						: null
					: undefined,
		};

		await systemConfigService.updateAnnouncement(id!, data);

		await logPlatformAction(
			req,
			"update_announcement",
			"announcement",
			id!,
			parseResult.data,
		);

		res.status(200).json({
			success: true,
			message: "Announcement updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Delete announcement
 * DELETE /api/platform/announcements/:id
 */
export async function deleteAnnouncement(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		await systemConfigService.deleteAnnouncement(id!);

		await logPlatformAction(req, "delete_announcement", "announcement", id!);

		res.status(200).json({
			success: true,
			message: "Announcement deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}
