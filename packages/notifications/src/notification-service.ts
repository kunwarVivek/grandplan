// ============================================
// NOTIFICATION SERVICE - Unified notification delivery
// ============================================

import { db } from "@grandplan/db";
import { queueManager } from "@grandplan/queue";
import { emailService } from "./email-service.js";
import { pushService } from "./push-service.js";
import type {
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

		// Check if notification type is muted
		if (preferences.mutedTypes.includes(payload.type)) {
			return;
		}

		// Check quiet hours
		if (this.isQuietHours(preferences)) {
			// Queue for digest instead
			await this.queueForDigest(payload);
			return;
		}

		// Create in-app notification
		const notification = await this.createInAppNotification(payload);

		// Determine delivery channels
		const channels = this.getDeliveryChannels(preferences, payload.type);

		// Queue deliveries
		if (
			channels.includes("email") &&
			preferences.digestFrequency === "realtime"
		) {
			await this.queueEmailDelivery(payload, notification.id);
		}

		if (channels.includes("push")) {
			await this.queuePushDelivery(payload);
		}

		if (channels.includes("slack") && preferences.slackEnabled) {
			await this.queueSlackDelivery(payload);
		}

		// Handle digest scheduling
		if (
			preferences.digestFrequency !== "realtime" &&
			preferences.digestFrequency !== "none"
		) {
			await this.queueForDigest(payload);
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
				data: payload.data ?? {},
				resourceType: payload.resourceType,
				resourceId: payload.resourceId,
				actionUrl: payload.actionUrl,
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
			digestFrequency:
				(prefs?.digestFrequency as NotificationPreferences["digestFrequency"]) ??
				"realtime",
			quietHoursStart: prefs?.quietHoursStart ?? undefined,
			quietHoursEnd: prefs?.quietHoursEnd ?? undefined,
			mutedTypes: (prefs?.mutedTypes as NotificationType[]) ?? [],
		};
	}

	/**
	 * Update user notification preferences
	 */
	async updatePreferences(
		userId: string,
		updates: Partial<Omit<NotificationPreferences, "userId">>,
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
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<void> {
		await db.notification.updateMany({
			where: { id: notificationId, userId },
			data: { read: true, readAt: new Date() },
		});
	}

	/**
	 * Mark all notifications as read for a user
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
	 * Get user notifications
	 */
	async getUserNotifications(
		userId: string,
		options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
	) {
		const { limit = 20, offset = 0, unreadOnly = false } = options;

		return db.notification.findMany({
			where: {
				userId,
				...(unreadOnly && { read: false }),
			},
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: offset,
		});
	}

	/**
	 * Check if currently in quiet hours
	 */
	private isQuietHours(preferences: NotificationPreferences): boolean {
		if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
			return false;
		}

		const now = new Date();
		const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

		const start = preferences.quietHoursStart;
		const end = preferences.quietHoursEnd;

		if (start <= end) {
			return currentTime >= start && currentTime <= end;
		}
		// Quiet hours span midnight
		return currentTime >= start || currentTime <= end;
	}

	/**
	 * Determine which channels to use for delivery
	 */
	private getDeliveryChannels(
		preferences: NotificationPreferences,
		_type: NotificationType,
	): NotificationChannel[] {
		const channels: NotificationChannel[] = ["in_app"];

		if (preferences.emailEnabled) {
			channels.push("email");
		}

		if (preferences.pushEnabled) {
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
		await queueManager.addJob("email", {
			notificationId,
			userId: payload.userId,
			type: payload.type,
			title: payload.title,
			body: payload.body,
			actionUrl: payload.actionUrl,
		});
	}

	/**
	 * Queue push notification delivery
	 */
	private async queuePushDelivery(payload: NotificationPayload): Promise<void> {
		await queueManager.addJob("notifications", {
			notificationId: payload.resourceId,
			channels: ["push"],
			userId: payload.userId,
		});
	}

	/**
	 * Queue Slack notification delivery
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
	private async queueForDigest(payload: NotificationPayload): Promise<void> {
		await db.digestQueue.create({
			data: {
				userId: payload.userId,
				notificationType: payload.type,
				data: payload as unknown as Record<string, unknown>,
			},
		});
	}
}

// Singleton instance
export const notificationService = new NotificationService();
