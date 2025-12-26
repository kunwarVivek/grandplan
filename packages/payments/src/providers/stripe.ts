// ============================================
// STRIPE PAYMENT PROVIDER
// ============================================

import Stripe from "stripe";
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

export class StripeProvider implements PaymentProviderInterface {
	name = "stripe" as const;
	private client: Stripe;
	private webhookSecret: string;

	constructor(secretKey: string, webhookSecret: string) {
		this.client = new Stripe(secretKey);
		this.webhookSecret = webhookSecret;
	}

	async createCustomer(params: CreateCustomerParams): Promise<string> {
		const customer = await this.client.customers.create({
			name: params.name,
			email: params.email,
			metadata: {
				organizationId: params.organizationId,
				...params.metadata,
			},
		});

		return customer.id;
	}

	async createSubscription(
		params: CreateSubscriptionParams,
	): Promise<SubscriptionResult> {
		const subscription = await this.client.subscriptions.create({
			customer: params.customerId,
			items: [{ price: params.planId }],
			metadata: {
				organizationId: params.organizationId,
			},
		});

		return {
			id: subscription.id,
			status: subscription.status,
			currentPeriodEnd: new Date(subscription.current_period_end * 1000),
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
		};
	}

	async createCheckoutSession(
		params: CreateCheckoutParams,
	): Promise<CheckoutSession> {
		const session = await this.client.checkout.sessions.create({
			mode: "subscription",
			line_items: [
				{
					price: params.planId,
					quantity: 1,
				},
			],
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			customer_email: params.customerEmail,
			metadata: {
				organizationId: params.organizationId,
				billingInterval: params.billingInterval,
			},
		});

		return {
			id: session.id,
			url: session.url!,
		};
	}

	async createPortalSession(customerId: string): Promise<PortalSession> {
		const session = await this.client.billingPortal.sessions.create({
			customer: customerId,
		});

		return {
			url: session.url,
		};
	}

	async cancelSubscription(
		subscriptionId: string,
		atPeriodEnd = true,
	): Promise<void> {
		if (atPeriodEnd) {
			await this.client.subscriptions.update(subscriptionId, {
				cancel_at_period_end: true,
			});
		} else {
			await this.client.subscriptions.cancel(subscriptionId);
		}
	}

	async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
		const subscription =
			await this.client.subscriptions.retrieve(subscriptionId);

		return {
			id: subscription.id,
			status: subscription.status,
			currentPeriodEnd: new Date(subscription.current_period_end * 1000),
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
		};
	}

	async parseWebhookEvent(
		payload: string | Buffer,
		signature: string,
	): Promise<WebhookEvent> {
		const event = this.client.webhooks.constructEvent(
			payload,
			signature,
			this.webhookSecret,
		);

		return {
			type: event.type,
			data: event.data.object as Record<string, unknown>,
		};
	}
}
