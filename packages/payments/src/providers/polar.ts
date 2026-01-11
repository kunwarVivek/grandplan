// ============================================
// POLAR PAYMENT PROVIDER
// ============================================

import { Polar } from "@polar-sh/sdk";
import { createHmac, timingSafeEqual } from "crypto";
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
	name = "POLAR" as const;
	private client: Polar;
	private webhookSecret?: string;

	constructor(accessToken: string, webhookSecret?: string) {
		this.client = new Polar({ accessToken });
		this.webhookSecret = webhookSecret;
	}

	async createCustomer(params: CreateCustomerParams): Promise<string> {
		// Polar uses checkout sessions rather than explicit customer creation
		// Return a composite ID for tracking
		return `polar_${params.organizationId}`;
	}

	async createSubscription(
		_params: CreateSubscriptionParams,
	): Promise<SubscriptionResult> {
		// Polar subscriptions are created via checkout
		// This would be called after webhook confirmation
		throw new Error("Use createCheckoutSession for Polar subscriptions");
	}

	async createCheckoutSession(
		params: CreateCheckoutParams,
	): Promise<CheckoutSession> {
		// Use the Polar SDK checkouts API
		const checkout = await this.client.checkouts.create({
			products: [params.planId],
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
		_atPeriodEnd = true,
	): Promise<void> {
		// Polar SDK update subscription - use SubscriptionCancel type
		await this.client.subscriptions.update({
			id: subscriptionId,
			subscriptionUpdate: { cancelAtPeriodEnd: true },
		});
	}

	async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
		const subscription = await this.client.subscriptions.get({
			id: subscriptionId,
		});

		return {
			id: subscription.id,
			status: subscription.status,
			currentPeriodEnd: subscription.currentPeriodEnd
				? new Date(subscription.currentPeriodEnd)
				: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		};
	}

	/**
	 * Parse and verify a Polar webhook event
	 * @param payload - Raw webhook payload
	 * @param signature - Webhook signature from X-Polar-Signature header
	 * @throws Error if signature verification fails
	 */
	async parseWebhookEvent(
		payload: string | Buffer,
		signature: string,
	): Promise<WebhookEvent> {
		const payloadString = payload.toString();

		// Verify webhook signature if secret is configured
		if (this.webhookSecret) {
			this.verifyWebhookSignature(payloadString, signature);
		}

		const data = JSON.parse(payloadString);
		return {
			type: data.type,
			data: data.data,
		};
	}

	/**
	 * Verify the webhook signature using HMAC-SHA256
	 * Polar uses the format: sha256=<signature>
	 */
	private verifyWebhookSignature(payload: string, signature: string): void {
		if (!this.webhookSecret) {
			throw new Error("Webhook secret not configured");
		}

		// Extract the signature from the header (format: sha256=<hex>)
		const expectedSig = signature.startsWith("sha256=")
			? signature.slice(7)
			: signature;

		// Compute HMAC-SHA256
		const computedSig = createHmac("sha256", this.webhookSecret)
			.update(payload)
			.digest("hex");

		// Constant-time comparison to prevent timing attacks
		const expectedBuffer = Buffer.from(expectedSig, "hex");
		const computedBuffer = Buffer.from(computedSig, "hex");

		if (
			expectedBuffer.length !== computedBuffer.length ||
			!timingSafeEqual(expectedBuffer, computedBuffer)
		) {
			throw new Error("Invalid webhook signature");
		}
	}
}
