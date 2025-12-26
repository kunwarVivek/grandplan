import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	Subscription,
	Plan,
	Invoice,
	UsageStats,
	UpgradePlanInput,
	CreateCheckoutInput,
	CheckoutSession,
	BillingPortalSession,
} from "../types";

// Fetch current subscription
export function useSubscription() {
	return useQuery({
		queryKey: queryKeys.billing.subscription,
		queryFn: async ({ signal }) => {
			return api.get<Subscription>("/api/billing/subscription", signal);
		},
	});
}

// Fetch available plans
export function usePlans() {
	return useQuery({
		queryKey: queryKeys.billing.plans,
		queryFn: async ({ signal }) => {
			return api.get<{ plans: Plan[] }>("/api/billing/plans", signal);
		},
	});
}

// Fetch invoice history
export function useInvoices(options?: { limit?: number; offset?: number }) {
	return useQuery({
		queryKey: [...queryKeys.billing.invoices, options],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (options?.limit) params.set("limit", options.limit.toString());
			if (options?.offset) params.set("offset", options.offset.toString());
			const query = params.toString();
			return api.get<{ invoices: Invoice[]; total: number }>(
				`/api/billing/invoices${query ? `?${query}` : ""}`,
				signal
			);
		},
	});
}

// Fetch usage statistics
export function useUsage() {
	return useQuery({
		queryKey: queryKeys.billing.usage,
		queryFn: async ({ signal }) => {
			return api.get<UsageStats>("/api/billing/usage", signal);
		},
	});
}

// Fetch usage limits
export function useLimits() {
	return useQuery({
		queryKey: queryKeys.billing.limits,
		queryFn: async ({ signal }) => {
			return api.get<{ limits: Record<string, number> }>("/api/billing/limits", signal);
		},
	});
}

// Upgrade/change plan
export function useUpgradePlan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpgradePlanInput) => {
			return api.post<Subscription>("/api/billing/upgrade", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription });
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.usage });
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.limits });
		},
	});
}

// Create checkout session (for new subscriptions)
export function useCreateCheckout() {
	return useMutation({
		mutationFn: async (input: CreateCheckoutInput) => {
			return api.post<CheckoutSession>("/api/billing/checkout", input);
		},
	});
}

// Cancel subscription
export function useCancelSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (options?: { cancelImmediately?: boolean }) => {
			return api.post<Subscription>("/api/billing/cancel", options);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription });
		},
	});
}

// Resume subscription (if canceled but not yet ended)
export function useResumeSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			return api.post<Subscription>("/api/billing/resume");
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription });
		},
	});
}

// Get billing portal URL
export function useCreateBillingPortal() {
	return useMutation({
		mutationFn: async (returnUrl?: string) => {
			return api.post<BillingPortalSession>("/api/billing/portal", { returnUrl });
		},
	});
}

// Update payment method
export function useUpdatePaymentMethod() {
	return useMutation({
		mutationFn: async () => {
			return api.post<{ url: string }>("/api/billing/update-payment");
		},
	});
}
