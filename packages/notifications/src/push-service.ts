// ============================================
// PUSH SERVICE - Web Push notifications
// ============================================

import { db } from "@grandplan/db";
import webpush from "web-push";
import type { PushPayload, PushSubscriptionData } from "./types.js";

export class PushService {
	private initialized = false;

	initialize(
		vapidPublicKey: string,
		vapidPrivateKey: string,
		contactEmail: string,
	): void {
		webpush.setVapidDetails(
			`mailto:${contactEmail}`,
			vapidPublicKey,
			vapidPrivateKey,
		);
		this.initialized = true;
	}

	/**
	 * Subscribe a user to push notifications
	 */
	async subscribe(
		userId: string,
		subscription: PushSubscriptionData,
	): Promise<void> {
		await db.pushSubscription.upsert({
			where: {
				endpoint: subscription.endpoint,
			},
			create: {
				userId,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			},
			update: {
				userId,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			},
		});
	}

	/**
	 * Unsubscribe a user from push notifications
	 */
	async unsubscribe(userId: string, endpoint: string): Promise<void> {
		await db.pushSubscription.deleteMany({
			where: { userId, endpoint },
		});
	}

	/**
	 * Send push notification to a user
	 */
	async send(payload: PushPayload): Promise<void> {
		if (!this.initialized) {
			console.warn("PushService not initialized, skipping push notification");
			return;
		}

		const subscriptions = await db.pushSubscription.findMany({
			where: { userId: payload.userId },
		});

		const notification = JSON.stringify({
			title: payload.title,
			body: payload.body,
			icon: payload.icon ?? "/icon-192.png",
			badge: payload.badge ?? "/badge-72.png",
			data: {
				url: payload.url,
				...payload.data,
			},
		});

		const sendPromises = subscriptions.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth,
						},
					},
					notification,
				);
			} catch (error) {
				// Remove invalid subscriptions
				if ((error as { statusCode?: number }).statusCode === 410) {
					await db.pushSubscription.delete({
						where: { id: sub.id },
					});
				} else {
					console.error("Push notification failed:", error);
				}
			}
		});

		await Promise.allSettled(sendPromises);
	}

	/**
	 * Send push notification to a specific user
	 */
	async sendToUser(
		userId: string,
		notification: Omit<PushPayload, "userId">,
	): Promise<void> {
		await this.send({ ...notification, userId });
	}

	/**
	 * Send push notification to multiple users
	 */
	async sendToMany(
		userIds: string[],
		notification: Omit<PushPayload, "userId">,
	): Promise<void> {
		await Promise.allSettled(
			userIds.map((userId) => this.send({ ...notification, userId })),
		);
	}

	/**
	 * Get VAPID public key for client-side subscription
	 */
	getPublicKey(): string {
		return process.env.VAPID_PUBLIC_KEY ?? "";
	}
}

// Singleton instance
export const pushService = new PushService();
