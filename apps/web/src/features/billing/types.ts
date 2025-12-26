export type PlanTier = "free" | "starter" | "professional" | "enterprise";

export type BillingInterval = "monthly" | "yearly";

export type SubscriptionStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "canceled"
	| "unpaid"
	| "incomplete"
	| "incomplete_expired"
	| "paused";

export type Plan = {
	id: string;
	name: string;
	tier: PlanTier;
	description: string;
	monthlyPrice: number;
	yearlyPrice: number;
	features: PlanFeature[];
	limits: PlanLimits;
	isPopular?: boolean;
	isEnterprise?: boolean;
};

export type PlanFeature = {
	name: string;
	included: boolean;
	limit?: number | string;
};

export type PlanLimits = {
	members: number;
	projects: number;
	tasksPerProject: number;
	storage: number; // in GB
	aiCredits: number;
	integrations: number;
	customFields: number;
	apiRequests: number; // per month
};

export type Subscription = {
	id: string;
	organizationId: string;
	planId: string;
	plan: Plan;
	status: SubscriptionStatus;
	interval: BillingInterval;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	trialStart?: Date | null;
	trialEnd?: Date | null;
	cancelAtPeriodEnd: boolean;
	canceledAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type Invoice = {
	id: string;
	number: string;
	organizationId: string;
	subscriptionId: string;
	status: "draft" | "open" | "paid" | "void" | "uncollectible";
	amountDue: number;
	amountPaid: number;
	currency: string;
	invoiceDate: Date;
	dueDate?: Date | null;
	paidAt?: Date | null;
	hostedInvoiceUrl?: string | null;
	invoicePdfUrl?: string | null;
	description?: string | null;
	lineItems: InvoiceLineItem[];
	createdAt: Date;
};

export type InvoiceLineItem = {
	id: string;
	description: string;
	quantity: number;
	unitAmount: number;
	amount: number;
};

export type UsageStats = {
	organizationId: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	usage: UsageMetric[];
};

export type UsageMetric = {
	name: string;
	displayName: string;
	used: number;
	limit: number;
	unit: string;
	percentage: number;
	isOverLimit: boolean;
};

export type UpgradePlanInput = {
	planId: string;
	interval: BillingInterval;
};

export type CreateCheckoutInput = {
	planId: string;
	interval: BillingInterval;
	successUrl?: string;
	cancelUrl?: string;
};

export type CheckoutSession = {
	url: string;
	sessionId: string;
};

export type BillingPortalSession = {
	url: string;
};

export const PLAN_TIER_CONFIG: Record<PlanTier, { label: string; color: string }> = {
	free: { label: "Free", color: "bg-muted text-muted-foreground" },
	starter: { label: "Starter", color: "bg-blue-500/10 text-blue-500" },
	professional: { label: "Professional", color: "bg-purple-500/10 text-purple-500" },
	enterprise: { label: "Enterprise", color: "bg-amber-500/10 text-amber-500" },
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<
	SubscriptionStatus,
	{ label: string; color: string }
> = {
	active: { label: "Active", color: "bg-emerald-500/10 text-emerald-500" },
	trialing: { label: "Trial", color: "bg-blue-500/10 text-blue-500" },
	past_due: { label: "Past Due", color: "bg-amber-500/10 text-amber-500" },
	canceled: { label: "Canceled", color: "bg-red-500/10 text-red-500" },
	unpaid: { label: "Unpaid", color: "bg-red-500/10 text-red-500" },
	incomplete: { label: "Incomplete", color: "bg-amber-500/10 text-amber-500" },
	incomplete_expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
	paused: { label: "Paused", color: "bg-muted text-muted-foreground" },
};
