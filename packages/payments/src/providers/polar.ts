// ============================================
// POLAR PAYMENT PROVIDER
// ============================================

import { Polar } from "@polar-sh/sdk";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	CreateCustomerParams,
	CreateSubscriptionParams,
	PaymentProviderInterface,
	PortalSession,
	SubscriptionResult,
	WebhookEvent,
} from "../types.js";

export class PolarProvider implements PaymentProviderInterface {
	name = "polar" as const;
	private client: Polar;

	constructor(accessToken: string) {
		this.client = new Polar({ accessToken });
	}

	async createCustomer(params: CreateCustomerParams): Promise<string> {
		// Polar uses checkout sessions rather than explicit customer creation
		// Return a composite ID for tracking
		return `polar_${params.organizationId}`;
	}

	async createSubscription(
		params: CreateSubscriptionParams,
	): Promise<SubscriptionResult> {
		// Polar subscriptions are created via checkout
		// This would be called after webhook confirmation
		throw new Error("Use createCheckoutSession for Polar subscriptions");
	}

	async createCheckoutSession(
		params: CreateCheckoutParams,
	): Promise<CheckoutSession> {
		const checkout = await this.client.checkouts.custom.create({
			productPriceId: params.planId,
			successUrl: params.successUrl,
			metadata: {
				organizationId: params.organizationId,
				billingInterval: params.billingInterval,
			},
		});

		return {
			id: checkout.id,
			url: checkout.url,
		};
	}

	async createPortalSession(customerId: string): Promise<PortalSession> {
		// Polar customer portal
		const organizationId = customerId.replace("polar_", "");
		// Generate portal URL based on organization
		return {
			url: `https://polar.sh/dashboard/${organizationId}/subscriptions`,
		};
	}

	async cancelSubscription(
		subscriptionId: string,
		atPeriodEnd = true,
	): Promise<void> {
		await this.client.subscriptions.cancel({ id: subscriptionId });
	}

	async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
		const subscription = await this.client.subscriptions.get({
			id: subscriptionId,
		});

		return {
			id: subscription.id,
			status: subscription.status,
			currentPeriodEnd: new Date(subscription.currentPeriodEnd),
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		};
	}

	async parseWebhookEvent(
		payload: string | Buffer,
		signature: string,
	): Promise<WebhookEvent> {
		// Polar webhook verification
		// In production, verify the signature
		const data = JSON.parse(payload.toString());
		return {
			type: data.type,
			data: data.data,
		};
	}
}
