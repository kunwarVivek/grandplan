// ============================================
// NOTIFICATION CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import { getCurrentTenant } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { serverNotificationService } from "../../application/services/notification.service.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const ListNotificationsQuerySchema = z.object({
	unreadOnly: z
		.string()
		.transform((v) => v === "true")
		.optional(),
	type: z.string().optional(),
	resourceType: z.string().optional(),
	limit: z.string().transform(Number).optional(),
	offset: z.string().transform(Number).optional(),
});

const MarkMultipleReadSchema = z.object({
	notificationIds: z.array(z.string().min(1)),
});

const UpdatePreferencesSchema = z.object({
	emailEnabled: z.boolean().optional(),
	pushEnabled: z.boolean().optional(),
	inAppEnabled: z.boolean().optional(),
	slackEnabled: z.boolean().optional(),
	digestEnabled: z.boolean().optional(),
	digestFrequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
	digestTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	quietHoursEnabled: z.boolean().optional(),
	quietHoursStart: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	quietHoursEnd: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	timezone: z.string().optional(),
	typeSettings: z
		.record(
			z.object({
				email: z.boolean().optional(),
				push: z.boolean().optional(),
				inApp: z.boolean().optional(),
			}),
		)
		.optional(),
});

const RegisterPushSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({
		p256dh: z.string().min(1),
		auth: z.string().min(1),
	}),
	userAgent: z.string().optional(),
	deviceName: z.string().optional(),
});

const UnregisterPushSchema = z.object({
	endpoint: z.string().url(),
});

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * List notifications
 * GET /api/notifications
 */
export async function listNotifications(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = ListNotificationsQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		const result = await serverNotificationService.getNotifications(
			tenant.userId,
			{
				unreadOnly: parseResult.data.unreadOnly,
				type: parseResult.data.type,
				resourceType: parseResult.data.resourceType,
				limit: parseResult.data.limit ?? 20,
				offset: parseResult.data.offset ?? 0,
			},
		);

		res.status(200).json({
			success: true,
			data: result.notifications,
			meta: {
				unreadCount: result.unreadCount,
				total: result.total,
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get a single notification
 * GET /api/notifications/:id
 */
export async function getNotification(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const tenant = getCurrentTenant();

		const notification = await serverNotificationService.getNotification(
			id,
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: notification,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const tenant = getCurrentTenant();

		await serverNotificationService.markAsRead(id, tenant.userId);

		res.status(200).json({
			success: true,
			message: "Notification marked as read",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Mark multiple notifications as read
 * POST /api/notifications/read-multiple
 */
export async function markMultipleAsRead(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = MarkMultipleReadSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		const count = await serverNotificationService.markMultipleAsRead(
			parseResult.data.notificationIds,
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: { markedCount: count },
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Mark all notifications as read
 * POST /api/notifications/read-all
 */
export async function markAllAsRead(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const count = await serverNotificationService.markAllAsRead(tenant.userId);

		res.status(200).json({
			success: true,
			data: { markedCount: count },
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Archive notification
 * POST /api/notifications/:id/archive
 */
export async function archiveNotification(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const tenant = getCurrentTenant();

		await serverNotificationService.archiveNotification(id, tenant.userId);

		res.status(200).json({
			success: true,
			message: "Notification archived",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const tenant = getCurrentTenant();

		await serverNotificationService.deleteNotification(id, tenant.userId);

		res.status(200).json({
			success: true,
			message: "Notification deleted",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
export async function getPreferences(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const preferences = await serverNotificationService.getPreferences(
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: preferences,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update notification preferences
 * PATCH /api/notifications/preferences
 */
export async function updatePreferences(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = UpdatePreferencesSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		await serverNotificationService.updatePreferences(
			tenant.userId,
			parseResult.data,
		);

		const updatedPreferences = await serverNotificationService.getPreferences(
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: updatedPreferences,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const count = await serverNotificationService.getUnreadCount(tenant.userId);

		res.status(200).json({
			success: true,
			data: { count },
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get notification summary
 * GET /api/notifications/summary
 */
export async function getNotificationSummary(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const summary = await serverNotificationService.getNotificationSummary(
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: summary,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Register push subscription
 * POST /api/notifications/push/subscribe
 */
export async function registerPushSubscription(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = RegisterPushSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		const subscriptionId =
			await serverNotificationService.registerPushSubscription(
				tenant.userId,
				parseResult.data,
			);

		res.status(201).json({
			success: true,
			data: { subscriptionId },
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Unregister push subscription
 * POST /api/notifications/push/unsubscribe
 */
export async function unregisterPushSubscription(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = UnregisterPushSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();

		await serverNotificationService.unregisterPushSubscription(
			tenant.userId,
			parseResult.data.endpoint,
		);

		res.status(200).json({
			success: true,
			message: "Push subscription removed",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get push subscriptions
 * GET /api/notifications/push/subscriptions
 */
export async function getPushSubscriptions(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		const subscriptions = await serverNotificationService.getPushSubscriptions(
			tenant.userId,
		);

		res.status(200).json({
			success: true,
			data: subscriptions,
		});
	} catch (error) {
		next(error);
	}
}
