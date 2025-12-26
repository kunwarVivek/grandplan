// ============================================
// SERVER NOTIFICATION SERVICE
// ============================================

import { NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";
import { notificationService as coreNotificationService } from "@grandplan/notifications";

export interface NotificationFilters {
	unreadOnly?: boolean;
	type?: string;
	resourceType?: string;
	limit?: number;
	offset?: number;
}

export interface NotificationPreferencesUpdate {
	emailEnabled?: boolean;
	pushEnabled?: boolean;
	inAppEnabled?: boolean;
	slackEnabled?: boolean;
	digestEnabled?: boolean;
	digestFrequency?: "HOURLY" | "DAILY" | "WEEKLY";
	digestTime?: string;
	quietHoursEnabled?: boolean;
	quietHoursStart?: string;
	quietHoursEnd?: string;
	timezone?: string;
	typeSettings?: Record<
		string,
		{ email?: boolean; push?: boolean; inApp?: boolean }
	>;
}

export class ServerNotificationService {
	/**
	 * Get notifications for a user
	 */
	async getNotifications(
		userId: string,
		filters: NotificationFilters = {},
	): Promise<{
		notifications: Array<{
			id: string;
			type: string;
			title: string;
			body: string | null;
			data: unknown;
			read: boolean;
			readAt: Date | null;
			createdAt: Date;
			actor: { id: string; name: string | null; image: string | null } | null;
			resourceType: string | null;
			resourceId: string | null;
		}>;
		unreadCount: number;
		total: number;
	}> {
		const {
			unreadOnly = false,
			type,
			resourceType,
			limit = 20,
			offset = 0,
		} = filters;

		const where: Record<string, unknown> = { userId };

		if (unreadOnly) {
			where.read = false;
		}

		if (type) {
			where.type = type;
		}

		if (resourceType) {
			where.resourceType = resourceType;
		}

		const [notifications, unreadCount, total] = await Promise.all([
			db.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: limit,
				skip: offset,
				include: {
					actor: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			}),
			db.notification.count({ where: { userId, read: false } }),
			db.notification.count({ where }),
		]);

		return {
			notifications: notifications.map((n) => ({
				id: n.id,
				type: n.type,
				title: n.title,
				body: n.body,
				data: n.data,
				read: n.read,
				readAt: n.readAt,
				createdAt: n.createdAt,
				actor: n.actor,
				resourceType: n.resourceType,
				resourceId: n.resourceId,
			})),
			unreadCount,
			total,
		};
	}

	/**
	 * Get a single notification
	 */
	async getNotification(
		notificationId: string,
		userId: string,
	): Promise<{
		id: string;
		type: string;
		title: string;
		body: string | null;
		data: unknown;
		read: boolean;
		readAt: Date | null;
		createdAt: Date;
	}> {
		const notification = await db.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new NotFoundError("Notification", notificationId);
		}

		return {
			id: notification.id,
			type: notification.type,
			title: notification.title,
			body: notification.body,
			data: notification.data,
			read: notification.read,
			readAt: notification.readAt,
			createdAt: notification.createdAt,
		};
	}

	/**
	 * Mark a notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<void> {
		const notification = await db.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new NotFoundError("Notification", notificationId);
		}

		await db.notification.update({
			where: { id: notificationId },
			data: {
				read: true,
				readAt: new Date(),
			},
		});
	}

	/**
	 * Mark multiple notifications as read
	 */
	async markMultipleAsRead(
		notificationIds: string[],
		userId: string,
	): Promise<number> {
		const result = await db.notification.updateMany({
			where: {
				id: { in: notificationIds },
				userId,
				read: false,
			},
			data: {
				read: true,
				readAt: new Date(),
			},
		});

		return result.count;
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(userId: string): Promise<number> {
		const result = await db.notification.updateMany({
			where: { userId, read: false },
			data: {
				read: true,
				readAt: new Date(),
			},
		});

		return result.count;
	}

	/**
	 * Archive a notification
	 */
	async archiveNotification(
		notificationId: string,
		userId: string,
	): Promise<void> {
		const notification = await db.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new NotFoundError("Notification", notificationId);
		}

		await db.notification.update({
			where: { id: notificationId },
			data: { archivedAt: new Date() },
		});
	}

	/**
	 * Delete a notification
	 */
	async deleteNotification(
		notificationId: string,
		userId: string,
	): Promise<void> {
		const notification = await db.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new NotFoundError("Notification", notificationId);
		}

		await db.notification.delete({ where: { id: notificationId } });
	}

	/**
	 * Get notification preferences
	 */
	async getPreferences(userId: string): Promise<{
		emailEnabled: boolean;
		pushEnabled: boolean;
		inAppEnabled: boolean;
		slackEnabled: boolean;
		digestEnabled: boolean;
		digestFrequency: string;
		digestTime: string | null;
		quietHoursEnabled: boolean;
		quietHoursStart: string | null;
		quietHoursEnd: string | null;
		timezone: string;
		typeSettings: Record<string, unknown>;
	}> {
		const prefs = await db.notificationPreference.findUnique({
			where: { userId },
		});

		// Return defaults if no preferences exist
		return {
			emailEnabled: prefs?.emailEnabled ?? true,
			pushEnabled: prefs?.pushEnabled ?? true,
			inAppEnabled: prefs?.inAppEnabled ?? true,
			slackEnabled: prefs?.slackEnabled ?? false,
			digestEnabled: prefs?.digestEnabled ?? false,
			digestFrequency: prefs?.digestFrequency ?? "DAILY",
			digestTime: prefs?.digestTime ?? null,
			quietHoursEnabled: prefs?.quietHoursEnabled ?? false,
			quietHoursStart: prefs?.quietHoursStart ?? null,
			quietHoursEnd: prefs?.quietHoursEnd ?? null,
			timezone: prefs?.timezone ?? "UTC",
			typeSettings: (prefs?.typeSettings as Record<string, unknown>) ?? {},
		};
	}

	/**
	 * Update notification preferences
	 */
	async updatePreferences(
		userId: string,
		updates: NotificationPreferencesUpdate,
	): Promise<void> {
		await db.notificationPreference.upsert({
			where: { userId },
			create: {
				userId,
				...updates,
			},
			update: updates,
		});
	}

	/**
	 * Register a push subscription
	 */
	async registerPushSubscription(
		userId: string,
		subscription: {
			endpoint: string;
			keys: { p256dh: string; auth: string };
			userAgent?: string;
			deviceName?: string;
		},
	): Promise<string> {
		const existing = await db.pushSubscription.findUnique({
			where: { endpoint: subscription.endpoint },
		});

		if (existing) {
			// Update existing subscription
			await db.pushSubscription.update({
				where: { id: existing.id },
				data: {
					p256dh: subscription.keys.p256dh,
					auth: subscription.keys.auth,
					lastUsedAt: new Date(),
				},
			});
			return existing.id;
		}

		// Create new subscription
		const newSub = await db.pushSubscription.create({
			data: {
				userId,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				userAgent: subscription.userAgent,
				deviceName: subscription.deviceName,
			},
		});

		return newSub.id;
	}

	/**
	 * Unregister a push subscription
	 */
	async unregisterPushSubscription(
		userId: string,
		endpoint: string,
	): Promise<void> {
		await db.pushSubscription.deleteMany({
			where: { userId, endpoint },
		});
	}

	/**
	 * Get push subscriptions for a user
	 */
	async getPushSubscriptions(userId: string): Promise<
		Array<{
			id: string;
			endpoint: string;
			deviceName: string | null;
			lastUsedAt: Date | null;
			createdAt: Date;
		}>
	> {
		return db.pushSubscription.findMany({
			where: { userId },
			select: {
				id: true,
				endpoint: true,
				deviceName: true,
				lastUsedAt: true,
				createdAt: true,
			},
		});
	}

	/**
	 * Get unread count for a user
	 */
	async getUnreadCount(userId: string): Promise<number> {
		return db.notification.count({
			where: { userId, read: false },
		});
	}

	/**
	 * Get notification summary by type
	 */
	async getNotificationSummary(
		userId: string,
	): Promise<Array<{ type: string; count: number; unread: number }>> {
		const notifications = await db.notification.groupBy({
			by: ["type"],
			where: { userId },
			_count: { id: true },
		});

		const unreadByType = await db.notification.groupBy({
			by: ["type"],
			where: { userId, read: false },
			_count: { id: true },
		});

		const unreadMap = new Map(unreadByType.map((u) => [u.type, u._count.id]));

		return notifications.map((n) => ({
			type: n.type,
			count: n._count.id,
			unread: unreadMap.get(n.type) ?? 0,
		}));
	}
}

// Singleton instance
export const serverNotificationService = new ServerNotificationService();
