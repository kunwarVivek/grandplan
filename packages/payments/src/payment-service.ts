// ============================================
// PAYMENT SERVICE - Unified payment abstraction
// ============================================

import { db } from "@grandplan/db";
import { PolarProvider } from "./providers/polar.js";
import { StripeProvider } from "./providers/stripe.js";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	PaymentProvider,
	PaymentProviderInterface,
	PortalSession,
	SubscriptionResult,
} from "./types.js";

export class PaymentService {
	private providers: Map<PaymentProvider, PaymentProviderInterface> = new Map();
	private defaultProvider: PaymentProvider = "stripe";

	initialize(config: {
		polar?: { accessToken: string };
		stripe?: { secretKey: string; webhookSecret: string };
		defaultProvider?: PaymentProvider;
	}): void {
		if (config.polar) {
			this.providers.set("polar", new PolarProvider(config.polar.accessToken));
		}

		if (config.stripe) {
			this.providers.set(
				"stripe",
				new StripeProvider(
					config.stripe.secretKey,
					config.stripe.webhookSecret,
				),
			);
		}

		if (config.defaultProvider) {
			this.defaultProvider = config.defaultProvider;
		}
	}

	private getProvider(provider?: PaymentProvider): PaymentProviderInterface {
		const providerName = provider ?? this.defaultProvider;
		const instance = this.providers.get(providerName);

		if (!instance) {
			throw new Error(`Payment provider ${providerName} not initialized`);
		}

		return instance;
	}

	/**
	 * Create a checkout session for a new subscription
	 */
	async createCheckout(
		params: CreateCheckoutParams,
		provider?: PaymentProvider,
	): Promise<CheckoutSession> {
		const providerInstance = this.getProvider(provider);
		return providerInstance.createCheckoutSession(params);
	}

	/**
	 * Create a customer portal session for subscription management
	 */
	async createPortalSession(
		organizationId: string,
		provider?: PaymentProvider,
	): Promise<PortalSession> {
		const subscription = await db.subscription.findFirst({
			where: {
				organizationId,
				status: { in: ["active", "trialing", "past_due"] },
			},
		});

		if (!subscription) {
			throw new Error("No active subscription found");
		}

		const providerInstance = this.getProvider(
			(subscription.paymentProvider as PaymentProvider) ?? provider,
		);
		return providerInstance.createPortalSession(
			subscription.externalCustomerId!,
		);
	}

	/**
	 * Get subscription details
	 */
	async getSubscription(
		organizationId: string,
	): Promise<{ subscription: unknown; plan: unknown } | null> {
		const subscription = await db.subscription.findFirst({
			where: { organizationId },
			include: { plan: true },
		});

		return subscription ? { subscription, plan: subscription.plan } : null;
	}

	/**
	 * Cancel a subscription
	 */
	async cancelSubscription(
		organizationId: string,
		atPeriodEnd = true,
	): Promise<void> {
		const subscription = await db.subscription.findFirst({
			where: { organizationId, status: { in: ["active", "trialing"] } },
		});

		if (!subscription) {
			throw new Error("No active subscription found");
		}

		const providerInstance = this.getProvider(
			subscription.paymentProvider as PaymentProvider,
		);
		await providerInstance.cancelSubscription(
			subscription.externalId!,
			atPeriodEnd,
		);

		await db.subscription.update({
			where: { id: subscription.id },
			data: { cancelAtPeriodEnd: atPeriodEnd },
		});
	}

	/**
	 * Handle webhook events from payment providers
	 */
	async handleWebhook(
		provider: PaymentProvider,
		payload: string | Buffer,
		signature: string,
	): Promise<void> {
		const providerInstance = this.getProvider(provider);
		const event = await providerInstance.parseWebhookEvent(payload, signature);

		switch (event.type) {
			case "checkout.session.completed":
			case "customer.subscription.created":
				await this.handleSubscriptionCreated(provider, event.data);
				break;

			case "customer.subscription.updated":
			case "subscription.updated":
				await this.handleSubscriptionUpdated(provider, event.data);
				break;

			case "customer.subscription.deleted":
			case "subscription.canceled":
				await this.handleSubscriptionCanceled(provider, event.data);
				break;

			case "invoice.paid":
			case "order.paid":
				await this.handleInvoicePaid(provider, event.data);
				break;

			case "invoice.payment_failed":
				await this.handlePaymentFailed(provider, event.data);
				break;
		}
	}

	private async handleSubscriptionCreated(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const organizationId = (data.metadata as Record<string, string>)
			?.organizationId;
		if (!organizationId) return;

		const externalId = (data.subscription as string) ?? (data.id as string);
		const customerId = data.customer as string;

		await db.subscription.upsert({
			where: { organizationId },
			create: {
				organizationId,
				planId: await this.resolvePlanId(provider, data),
				status: "active",
				paymentProvider: provider,
				externalId,
				externalCustomerId: customerId,
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
			update: {
				status: "active",
				externalId,
				externalCustomerId: customerId,
			},
		});
	}

	private async handleSubscriptionUpdated(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = data.id as string;

		await db.subscription.updateMany({
			where: { externalId, paymentProvider: provider },
			data: {
				status: data.status as string,
				cancelAtPeriodEnd: data.cancel_at_period_end as boolean,
			},
		});
	}

	private async handleSubscriptionCanceled(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = data.id as string;

		await db.subscription.updateMany({
			where: { externalId, paymentProvider: provider },
			data: { status: "canceled" },
		});
	}

	private async handleInvoicePaid(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const subscriptionId = data.subscription as string;
		const subscription = await db.subscription.findFirst({
			where: { externalId: subscriptionId },
		});

		if (subscription) {
			await db.invoice.create({
				data: {
					subscriptionId: subscription.id,
					amount: (data.amount_paid as number) ?? (data.amount as number) ?? 0,
					currency: (data.currency as string) ?? "usd",
					status: "paid",
					externalId: data.id as string,
					paidAt: new Date(),
				},
			});
		}
	}

	private async handlePaymentFailed(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const subscriptionId = data.subscription as string;

		await db.subscription.updateMany({
			where: { externalId: subscriptionId, paymentProvider: provider },
			data: { status: "past_due" },
		});
	}

	private async resolvePlanId(
		provider: PaymentProvider,
		data: Record<string, unknown>,
	): Promise<string> {
		// Find plan by external price ID
		const priceId = (
			data.items as { data?: Array<{ price?: { id?: string } }> }
		)?.data?.[0]?.price?.id;

		if (priceId) {
			const plan = await db.plan.findFirst({
				where:
					provider === "stripe"
						? { stripePriceIdMonthly: priceId }
						: { polarProductId: priceId },
			});
			if (plan) return plan.id;
		}

		// Fallback to free plan
		const freePlan = await db.plan.findFirst({ where: { name: "Free" } });
		return freePlan?.id ?? "default";
	}
}

// Singleton instance
export const paymentService = new PaymentService();
