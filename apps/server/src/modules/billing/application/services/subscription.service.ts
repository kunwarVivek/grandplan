// ============================================
// SUBSCRIPTION SERVICE
// ============================================

import { ForbiddenError, NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";
import { paymentService } from "@grandplan/payments";

export interface CreateCheckoutInput {
	organizationId: string;
	planId: string;
	billingInterval: "monthly" | "yearly";
	successUrl: string;
	cancelUrl: string;
	customerEmail?: string;
}

export interface SubscriptionInfo {
	id: string;
	planId: string;
	planName: string;
	status: string;
	billingCycle: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	cancelAtPeriodEnd: boolean;
	trialEndsAt: Date | null;
	features: Record<string, boolean>;
	limits: {
		maxUsers: number | null;
		maxTeams: number | null;
		maxProjects: number | null;
		maxStorageGB: number | null;
		maxAIRequestsPerMonth: number | null;
	};
	usage: {
		usedSeats: number;
		usedStorageGB: number;
		usedAIRequests: number;
	};
}

export class SubscriptionService {
	/**
	 * Get current subscription for an organization
	 */
	async getSubscription(
		organizationId: string,
	): Promise<SubscriptionInfo | null> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) {
			return null;
		}

		return {
			id: subscription.id,
			planId: subscription.planId,
			planName: subscription.plan.name,
			status: subscription.status,
			billingCycle: subscription.billingCycle,
			currentPeriodStart: subscription.currentPeriodStart,
			currentPeriodEnd: subscription.currentPeriodEnd,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			trialEndsAt: subscription.trialEndsAt,
			features: subscription.plan.features as Record<string, boolean>,
			limits: {
				maxUsers: subscription.plan.maxUsers,
				maxTeams: subscription.plan.maxTeams,
				maxProjects: subscription.plan.maxProjects,
				maxStorageGB: subscription.plan.maxStorageGB,
				maxAIRequestsPerMonth: subscription.plan.maxAIRequestsPerMonth,
			},
			usage: {
				usedSeats: subscription.usedSeats,
				usedStorageGB: Number(subscription.usedStorageGB),
				usedAIRequests: subscription.usedAIRequests,
			},
		};
	}

	/**
	 * Create a checkout session for a new subscription or upgrade
	 */
	async createCheckout(
		input: CreateCheckoutInput,
	): Promise<{ url: string; sessionId: string }> {
		const {
			organizationId,
			planId,
			billingInterval,
			successUrl,
			cancelUrl,
			customerEmail,
		} = input;

		// Get the plan
		const plan = await db.plan.findUnique({ where: { id: planId } });
		if (!plan) {
			throw new NotFoundError("Plan", planId);
		}

		if (!plan.isActive) {
			throw new ForbiddenError("This plan is not available");
		}

		// Get the price ID based on billing interval
		const priceId =
			billingInterval === "yearly"
				? (plan.stripePriceIdYearly ?? plan.polarProductId)
				: (plan.stripePriceIdMonthly ?? plan.polarProductId);

		if (!priceId) {
			throw new Error("Plan does not have a configured price");
		}

		// Create checkout session
		const session = await paymentService.createCheckout({
			organizationId,
			planId: priceId,
			billingInterval,
			successUrl,
			cancelUrl,
			customerEmail,
		});

		return {
			url: session.url,
			sessionId: session.id,
		};
	}

	/**
	 * Create a customer portal session for subscription management
	 */
	async createPortalSession(organizationId: string): Promise<{ url: string }> {
		const portal = await paymentService.createPortalSession(organizationId);
		return { url: portal.url };
	}

	/**
	 * Cancel an active subscription
	 */
	async cancelSubscription(
		organizationId: string,
		atPeriodEnd = true,
	): Promise<void> {
		await paymentService.cancelSubscription(organizationId, atPeriodEnd);
	}

	/**
	 * Reactivate a subscription that was set to cancel at period end
	 */
	async reactivateSubscription(organizationId: string): Promise<void> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (!subscription) {
			throw new NotFoundError("Subscription", organizationId);
		}

		if (!subscription.cancelAtPeriodEnd) {
			throw new Error("Subscription is not set to cancel");
		}

		// Update local record - the payment provider webhook will confirm
		await db.subscription.update({
			where: { id: subscription.id },
			data: { cancelAtPeriodEnd: false },
		});
	}

	/**
	 * Get available plans
	 */
	async getAvailablePlans(): Promise<
		Array<{
			id: string;
			name: string;
			description: string | null;
			priceMonthly: number | null;
			priceYearly: number | null;
			features: Record<string, boolean>;
			limits: {
				maxUsers: number | null;
				maxTeams: number | null;
				maxProjects: number | null;
				maxStorageGB: number | null;
				maxAIRequestsPerMonth: number | null;
			};
			isEnterprise: boolean;
			isFree: boolean;
			trialDays: number;
		}>
	> {
		const plans = await db.plan.findMany({
			where: { isActive: true },
			orderBy: { displayOrder: "asc" },
		});

		return plans.map((plan) => ({
			id: plan.id,
			name: plan.name,
			description: plan.description,
			priceMonthly: plan.priceMonthly ? Number(plan.priceMonthly) : null,
			priceYearly: plan.priceYearly ? Number(plan.priceYearly) : null,
			features: plan.features as Record<string, boolean>,
			limits: {
				maxUsers: plan.maxUsers,
				maxTeams: plan.maxTeams,
				maxProjects: plan.maxProjects,
				maxStorageGB: plan.maxStorageGB,
				maxAIRequestsPerMonth: plan.maxAIRequestsPerMonth,
			},
			isEnterprise: plan.isEnterprise,
			isFree: plan.isFree,
			trialDays: plan.trialDays,
		}));
	}

	/**
	 * Check if organization has access to a feature
	 */
	async hasFeature(organizationId: string, feature: string): Promise<boolean> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) {
			// No subscription - check if there's a free plan default
			return false;
		}

		const features = subscription.plan.features as Record<string, boolean>;
		return features[feature] === true;
	}

	/**
	 * Check if organization is within a usage limit
	 */
	async checkLimit(
		organizationId: string,
		limitType: "users" | "teams" | "projects" | "storage" | "aiRequests",
	): Promise<{ allowed: boolean; current: number; max: number | null }> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) {
			return { allowed: false, current: 0, max: 0 };
		}

		const limits: Record<string, { current: number; max: number | null }> = {
			users: {
				current: subscription.usedSeats,
				max: subscription.plan.maxUsers,
			},
			teams: {
				current: 0, // Would need to count teams
				max: subscription.plan.maxTeams,
			},
			projects: {
				current: 0, // Would need to count projects
				max: subscription.plan.maxProjects,
			},
			storage: {
				current: Number(subscription.usedStorageGB),
				max: subscription.plan.maxStorageGB,
			},
			aiRequests: {
				current: subscription.usedAIRequests,
				max: subscription.plan.maxAIRequestsPerMonth,
			},
		};

		const limit = limits[limitType];
		const allowed = limit.max === null || limit.current < limit.max;

		return {
			allowed,
			current: limit.current,
			max: limit.max,
		};
	}

	/**
	 * Handle trial expiration
	 */
	async handleTrialExpiration(organizationId: string): Promise<void> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (!subscription || subscription.status !== "TRIALING") {
			return;
		}

		if (subscription.trialEndsAt && subscription.trialEndsAt <= new Date()) {
			// Trial has expired - update status
			await db.subscription.update({
				where: { id: subscription.id },
				data: {
					status: "PAST_DUE",
				},
			});

			// Would typically send notification here
		}
	}
}

// Singleton instance
export const subscriptionService = new SubscriptionService();
