// ============================================
// NOTIFICATION SERVICE - Unified notification delivery
// ============================================

import { db, type Prisma } from "@grandplan/db";
import { queueManager } from "@grandplan/queue";
import { pushService } from "./push-service.js";
import type {
	DigestFrequency,
	NotificationChannel,
	NotificationPayload,
	NotificationPreferences,
	NotificationType,
} from "./types.js";

export class NotificationService {
	/**
	 * Send a notification through all enabled channels
	 */
	async send(payload: NotificationPayload): Promise<void> {
		// Get user preferences
		const preferences = await this.getUserPreferences(payload.userId);

		// Check if notification type is disabled in typeSettings
		const typeConfig = preferences.typeSettings[payload.type];
		if (typeConfig && !typeConfig.email && !typeConfig.push) {
			return;
		}

		// Check quiet hours
		if (this.isQuietHours(preferences)) {
			// Queue for digest instead
			if (preferences.digestEnabled) {
				await this.queueForDigest(payload, preferences.digestFrequency);
			}
			return;
		}

		// Create in-app notification
		const notification = await this.createInAppNotification(payload);

		// Determine delivery channels
		const channels = this.getDeliveryChannels(preferences, payload.type);

		// Queue deliveries
		if (channels.includes("email") && !preferences.digestEnabled) {
			await this.queueEmailDelivery(payload, notification.id);
		}

		if (channels.includes("push")) {
			await this.queuePushDelivery(payload);
		}

		if (channels.includes("slack") && preferences.slackEnabled) {
			await this.queueSlackDelivery(payload);
		}

		// Handle digest scheduling
		if (preferences.digestEnabled) {
			await this.queueForDigest(payload, preferences.digestFrequency);
		}
	}

	/**
	 * Send notification to multiple users
	 */
	async sendToMany(
		userIds: string[],
		notificationData: Omit<NotificationPayload, "userId">,
	): Promise<void> {
		await Promise.allSettled(
			userIds.map((userId) => this.send({ ...notificationData, userId })),
		);
	}

	/**
	 * Create in-app notification
	 */
	private async createInAppNotification(payload: NotificationPayload) {
		return db.notification.create({
			data: {
				userId: payload.userId,
				type: payload.type,
				title: payload.title,
				body: payload.body,
				data: {
					...payload.data,
					actionUrl: payload.actionUrl,
				} as Prisma.InputJsonValue,
				resourceType: payload.resourceType,
				resourceId: payload.resourceId,
				read: false,
			},
		});
	}

	/**
	 * Get user notification preferences
	 */
	async getUserPreferences(userId: string): Promise<NotificationPreferences> {
		const prefs = await db.notificationPreference.findUnique({
			where: { userId },
		});

		return {
			userId,
			emailEnabled: prefs?.emailEnabled ?? true,
			pushEnabled: prefs?.pushEnabled ?? true,
			slackEnabled: prefs?.slackEnabled ?? false,
			digestEnabled: prefs?.digestEnabled ?? false,
			digestFrequency:
				(prefs?.digestFrequency as DigestFrequency) ?? "DAILY",
			quietHoursEnabled: prefs?.quietHoursEnabled ?? false,
			quietHoursStart: prefs?.quietHoursStart ?? undefined,
			quietHoursEnd: prefs?.quietHoursEnd ?? undefined,
			typeSettings:
				(prefs?.typeSettings as Record<
					string,
					{ email?: boolean; push?: boolean }
				>) ?? {},
		};
	}

	/**
	 * Update user notification preferences
	 */
	async updatePreferences(
		userId: string,
		updates: Partial<Omit<NotificationPreferences, "userId">>,
	): Promise<void> {
		const data: Record<string, unknown> = {};

		if (updates.emailEnabled !== undefined)
			data.emailEnabled = updates.emailEnabled;
		if (updates.pushEnabled !== undefined)
			data.pushEnabled = updates.pushEnabled;
		if (updates.slackEnabled !== undefined)
			data.slackEnabled = updates.slackEnabled;
		if (updates.digestEnabled !== undefined)
			data.digestEnabled = updates.digestEnabled;
		if (updates.digestFrequency !== undefined)
			data.digestFrequency = updates.digestFrequency;
		if (updates.quietHoursEnabled !== undefined)
			data.quietHoursEnabled = updates.quietHoursEnabled;
		if (updates.quietHoursStart !== undefined)
			data.quietHoursStart = updates.quietHoursStart;
		if (updates.quietHoursEnd !== undefined)
			data.quietHoursEnd = updates.quietHoursEnd;
		if (updates.typeSettings !== undefined)
			data.typeSettings = updates.typeSettings;

		await db.notificationPreference.upsert({
			where: { userId },
			create: {
				userId,
				...data,
			},
			update: data,
		});
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<void> {
		await db.notification.updateMany({
			where: { id: notificationId, userId },
			data: { read: true, readAt: new Date() },
		});
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(userId: string): Promise<void> {
		await db.notification.updateMany({
			where: { userId, read: false },
			data: { read: true, readAt: new Date() },
		});
	}

	/**
	 * Get unread notification count
	 */
	async getUnreadCount(userId: string): Promise<number> {
		return db.notification.count({
			where: { userId, read: false },
		});
	}

	/**
	 * Get notifications with pagination
	 */
	async getNotifications(
		userId: string,
		options: { limit?: number; cursor?: string; unreadOnly?: boolean } = {},
	) {
		const { limit = 20, cursor, unreadOnly = false } = options;

		return db.notification.findMany({
			where: {
				userId,
				...(unreadOnly ? { read: false } : {}),
				...(cursor ? { id: { lt: cursor } } : {}),
			},
			orderBy: { createdAt: "desc" },
			take: limit + 1,
		});
	}

	/**
	 * Check if currently in quiet hours
	 */
	private isQuietHours(preferences: NotificationPreferences): boolean {
		if (
			!preferences.quietHoursEnabled ||
			!preferences.quietHoursStart ||
			!preferences.quietHoursEnd
		) {
			return false;
		}

		const now = new Date();
		const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

		const start = preferences.quietHoursStart;
		const end = preferences.quietHoursEnd;

		// Handle overnight quiet hours (e.g., 22:00 - 08:00)
		if (start > end) {
			return currentTime >= start || currentTime < end;
		}

		return currentTime >= start && currentTime < end;
	}

	/**
	 * Determine which channels to use for delivery
	 */
	private getDeliveryChannels(
		preferences: NotificationPreferences,
		type: NotificationType,
	): NotificationChannel[] {
		const channels: NotificationChannel[] = ["in_app"];

		// Check type-specific settings
		const typeConfig = preferences.typeSettings[type];

		if (preferences.emailEnabled && (typeConfig?.email !== false)) {
			channels.push("email");
		}

		if (preferences.pushEnabled && (typeConfig?.push !== false)) {
			channels.push("push");
		}

		if (preferences.slackEnabled) {
			channels.push("slack");
		}

		return channels;
	}

	/**
	 * Queue email delivery
	 */
	private async queueEmailDelivery(
		payload: NotificationPayload,
		notificationId: string,
	): Promise<void> {
		await queueManager.addJob("notifications", {
			notificationId,
			channels: ["email"],
			userId: payload.userId,
		});
	}

	/**
	 * Queue push notification
	 */
	private async queuePushDelivery(payload: NotificationPayload): Promise<void> {
		await pushService.sendToUser(payload.userId, {
			title: payload.title,
			body: payload.body,
			url: payload.actionUrl,
			data: payload.data,
		});
	}

	/**
	 * Queue Slack notification
	 */
	private async queueSlackDelivery(
		payload: NotificationPayload,
	): Promise<void> {
		// Would integrate with Slack integration
		await queueManager.addJob("notifications", {
			notificationId: payload.resourceId,
			channels: ["slack"],
			userId: payload.userId,
		});
	}

	/**
	 * Queue notification for digest
	 */
	private async queueForDigest(
		payload: NotificationPayload,
		frequency: DigestFrequency,
	): Promise<void> {
		const scheduledFor = this.getNextDigestTime(frequency);

		await db.digestQueue.create({
			data: {
				userId: payload.userId,
				frequency,
				notifications: [payload] as unknown as Prisma.InputJsonValue,
				scheduledFor,
			},
		});
	}

	/**
	 * Calculate next digest delivery time
	 */
	private getNextDigestTime(frequency: DigestFrequency): Date {
		const now = new Date();

		switch (frequency) {
			case "HOURLY":
				return new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					now.getHours() + 1,
					0,
					0,
				);
			case "DAILY":
				return new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate() + 1,
					9,
					0,
					0,
				);
			case "WEEKLY":
				const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
				return new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate() + daysUntilMonday,
					9,
					0,
					0,
				);
		}
	}
}

// Singleton instance
export const notificationService = new NotificationService();
