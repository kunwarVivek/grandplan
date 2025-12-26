// ============================================
// PAYMENT TYPE DEFINITIONS
// ============================================

export type PaymentProvider = "polar" | "stripe";

export interface CreateCustomerParams {
	organizationId: string;
	name: string;
	email: string;
	metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
	customerId: string;
	planId: string;
	organizationId: string;
	billingInterval: "monthly" | "yearly";
}

export interface CreateCheckoutParams {
	organizationId: string;
	planId: string;
	billingInterval: "monthly" | "yearly";
	successUrl: string;
	cancelUrl: string;
	customerEmail?: string;
}

export interface SubscriptionResult {
	id: string;
	status: string;
	currentPeriodEnd: Date;
	cancelAtPeriodEnd: boolean;
}

export interface CheckoutSession {
	id: string;
	url: string;
}

export interface PortalSession {
	url: string;
}

export interface WebhookEvent {
	type: string;
	data: Record<string, unknown>;
}

export interface PaymentProviderInterface {
	name: PaymentProvider;
	createCustomer(params: CreateCustomerParams): Promise<string>;
	createSubscription(
		params: CreateSubscriptionParams,
	): Promise<SubscriptionResult>;
	createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession>;
	createPortalSession(customerId: string): Promise<PortalSession>;
	cancelSubscription(
		subscriptionId: string,
		atPeriodEnd?: boolean,
	): Promise<void>;
	getSubscription(subscriptionId: string): Promise<SubscriptionResult>;
	parseWebhookEvent(
		payload: string | Buffer,
		signature: string,
	): Promise<WebhookEvent>;
}
