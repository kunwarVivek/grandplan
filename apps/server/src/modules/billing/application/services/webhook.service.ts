// ============================================
// WEBHOOK SERVICE - Handle payment provider webhooks
// ============================================

import { db } from "@grandplan/db";
import { notificationService } from "@grandplan/notifications";
import { paymentService } from "@grandplan/payments";
import { usageService } from "./usage.service.js";

export type WebhookProvider = "polar" | "stripe";

export interface WebhookResult {
	handled: boolean;
	eventType: string;
	message?: string;
}

export class WebhookService {
	/**
	 * Handle incoming webhook from a payment provider
	 */
	async handleWebhook(
		provider: WebhookProvider,
		payload: string | Buffer,
		signature: string,
	): Promise<WebhookResult> {
		// Delegate to payment service which handles event parsing and routing
		await paymentService.handleWebhook(provider, payload, signature);

		// Parse the event for our internal handling
		const event = JSON.parse(payload.toString());
		const eventType = event.type ?? event.event;

		// Additional handling based on event type
		await this.handleEventSideEffects(provider, eventType, event.data ?? event);

		return {
			handled: true,
			eventType,
		};
	}

	/**
	 * Handle side effects of webhook events
	 */
	private async handleEventSideEffects(
		provider: WebhookProvider,
		eventType: string,
		data: Record<string, unknown>,
	): Promise<void> {
		switch (eventType) {
			case "checkout.session.completed":
			case "customer.subscription.created":
				await this.handleSubscriptionCreated(data);
				break;

			case "customer.subscription.updated":
			case "subscription.updated":
				await this.handleSubscriptionUpdated(data);
				break;

			case "customer.subscription.deleted":
			case "subscription.canceled":
				await this.handleSubscriptionCanceled(data);
				break;

			case "invoice.paid":
			case "order.paid":
				await this.handlePaymentSucceeded(data);
				break;

			case "invoice.payment_failed":
				await this.handlePaymentFailed(data);
				break;

			case "customer.subscription.trial_will_end":
				await this.handleTrialEnding(data);
				break;
		}
	}

	/**
	 * Handle new subscription created
	 */
	private async handleSubscriptionCreated(
		data: Record<string, unknown>,
	): Promise<void> {
		const organizationId = (data.metadata as Record<string, string>)
			?.organizationId;
		if (!organizationId) return;

		// Get organization admins to notify
		const admins = await db.organizationMember.findMany({
			where: {
				organizationId,
				role: {
					name: { in: ["Owner", "Admin"] },
				},
			},
			include: { user: true },
		});

		// Get subscription details
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) return;

		// Notify admins
		for (const admin of admins) {
			await notificationService.send({
				type: "billing.subscription_expiring", // Using closest available type
				userId: admin.userId,
				title: "Subscription Activated",
				body: `Your ${subscription.plan.name} subscription is now active!`,
				resourceType: "subscription",
				resourceId: subscription.id,
				actionUrl: "/settings/billing",
			});
		}
	}

	/**
	 * Handle subscription updated
	 */
	private async handleSubscriptionUpdated(
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = data.id as string;

		const subscription = await db.subscription.findFirst({
			where: { externalId },
			include: { plan: true },
		});

		if (!subscription) return;

		// Check if plan changed (upgrade/downgrade)
		const previousStatus = subscription.status;
		const newStatus = data.status as string;

		if (previousStatus !== newStatus) {
			// Log status change
			console.log(
				`Subscription ${subscription.id} status changed: ${previousStatus} -> ${newStatus}`,
			);
		}
	}

	/**
	 * Handle subscription canceled
	 */
	private async handleSubscriptionCanceled(
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = data.id as string;

		const subscription = await db.subscription.findFirst({
			where: { externalId },
		});

		if (!subscription) return;

		// Get organization admins
		const admins = await db.organizationMember.findMany({
			where: {
				organizationId: subscription.organizationId,
				role: {
					name: { in: ["Owner", "Admin"] },
				},
			},
		});

		// Notify admins
		for (const admin of admins) {
			await notificationService.send({
				type: "billing.subscription_expiring",
				userId: admin.userId,
				title: "Subscription Canceled",
				body: "Your subscription has been canceled. Access will continue until the end of the billing period.",
				resourceType: "subscription",
				resourceId: subscription.id,
				actionUrl: "/settings/billing",
			});
		}
	}

	/**
	 * Handle successful payment
	 */
	private async handlePaymentSucceeded(
		data: Record<string, unknown>,
	): Promise<void> {
		const subscriptionId = data.subscription as string;

		const subscription = await db.subscription.findFirst({
			where: { externalId: subscriptionId },
		});

		if (!subscription) return;

		// Reset usage counters for new period
		await usageService.resetPeriodUsage(subscription.id);

		// Get organization admins
		const admins = await db.organizationMember.findMany({
			where: {
				organizationId: subscription.organizationId,
				role: {
					name: { in: ["Owner", "Admin"] },
				},
			},
		});

		// Notify about successful payment
		for (const admin of admins) {
			await notificationService.send({
				type: "billing.subscription_expiring", // Using available type
				userId: admin.userId,
				title: "Payment Successful",
				body: "Your subscription payment was processed successfully.",
				resourceType: "subscription",
				resourceId: subscription.id,
				actionUrl: "/settings/billing",
			});
		}
	}

	/**
	 * Handle failed payment
	 */
	private async handlePaymentFailed(
		data: Record<string, unknown>,
	): Promise<void> {
		const subscriptionId = data.subscription as string;

		const subscription = await db.subscription.findFirst({
			where: { externalId: subscriptionId },
		});

		if (!subscription) return;

		// Get organization admins
		const admins = await db.organizationMember.findMany({
			where: {
				organizationId: subscription.organizationId,
				role: {
					name: { in: ["Owner", "Admin"] },
				},
			},
		});

		// Notify about failed payment
		for (const admin of admins) {
			await notificationService.send({
				type: "billing.payment_failed",
				userId: admin.userId,
				title: "Payment Failed",
				body: "We were unable to process your subscription payment. Please update your payment method.",
				resourceType: "subscription",
				resourceId: subscription.id,
				actionUrl: "/settings/billing/payment-method",
			});
		}
	}

	/**
	 * Handle trial ending soon
	 */
	private async handleTrialEnding(
		data: Record<string, unknown>,
	): Promise<void> {
		const subscriptionId = (data.subscription as string) ?? (data.id as string);

		const subscription = await db.subscription.findFirst({
			where: { externalId: subscriptionId },
			include: { plan: true },
		});

		if (!subscription) return;

		// Get organization admins
		const admins = await db.organizationMember.findMany({
			where: {
				organizationId: subscription.organizationId,
				role: {
					name: { in: ["Owner", "Admin"] },
				},
			},
		});

		const daysLeft = subscription.trialEndsAt
			? Math.ceil(
					(subscription.trialEndsAt.getTime() - Date.now()) /
						(1000 * 60 * 60 * 24),
				)
			: 3;

		// Notify about trial ending
		for (const admin of admins) {
			await notificationService.send({
				type: "billing.subscription_expiring",
				userId: admin.userId,
				title: "Trial Ending Soon",
				body: `Your trial ends in ${daysLeft} days. Add a payment method to continue using ${subscription.plan.name}.`,
				resourceType: "subscription",
				resourceId: subscription.id,
				actionUrl: "/settings/billing/upgrade",
			});
		}
	}

	/**
	 * Verify webhook signature for Polar
	 */
	verifyPolarSignature(
		payload: string,
		signature: string,
		secret: string,
	): boolean {
		// Polar uses standard webhook signature verification
		// In production, implement proper HMAC verification
		const crypto = require("crypto");
		const expectedSignature = crypto
			.createHmac("sha256", secret)
			.update(payload)
			.digest("hex");
		return signature === `sha256=${expectedSignature}`;
	}

	/**
	 * Verify webhook signature for Stripe
	 */
	verifyStripeSignature(
		payload: string,
		signature: string,
		secret: string,
	): boolean {
		// Stripe signature verification is handled by the Stripe SDK
		// This is a placeholder - actual verification happens in payment service
		return true;
	}
}

// Singleton instance
export const webhookService = new WebhookService();
