import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	BillingPortalSession,
	CheckoutSession,
	CreateCheckoutInput,
	Invoice,
	Plan,
	Subscription,
	UpgradePlanInput,
	UsageStats,
} from "../types";

// API response wrapper type
interface ApiResponse<T> {
	success: boolean;
	data: T;
}

// Fetch current subscription
export function useSubscription() {
	return useQuery({
		queryKey: queryKeys.billing.subscription,
		queryFn: async ({ signal }) => {
			const response = await api.get<ApiResponse<Subscription | null>>(
				"/api/billing/subscription",
				signal,
			);
			return response.data;
		},
	});
}

// Fetch available plans
export function usePlans() {
	return useQuery({
		queryKey: queryKeys.billing.plans,
		queryFn: async ({ signal }) => {
			const response = await api.get<ApiResponse<Plan[]>>(
				"/api/billing/plans",
				signal,
			);
			return response.data;
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
			const response = await api.get<
				ApiResponse<{ invoices: Invoice[]; total: number }>
			>(`/api/billing/invoices${query ? `?${query}` : ""}`, signal);
			return response.data;
		},
	});
}

// Fetch usage statistics
export function useUsage() {
	return useQuery({
		queryKey: queryKeys.billing.usage,
		queryFn: async ({ signal }) => {
			const response = await api.get<ApiResponse<UsageStats>>(
				"/api/billing/usage",
				signal,
			);
			return response.data;
		},
	});
}

// Fetch usage limits
export function useLimits() {
	return useQuery({
		queryKey: queryKeys.billing.limits,
		queryFn: async ({ signal }) => {
			const response = await api.get<
				ApiResponse<{ limits: Record<string, number> }>
			>("/api/billing/limits", signal);
			return response.data;
		},
	});
}

// Upgrade/change plan
export function useUpgradePlan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpgradePlanInput) => {
			const response = await api.post<ApiResponse<Subscription>>(
				"/api/billing/upgrade",
				input,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription,
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.usage });
			queryClient.invalidateQueries({ queryKey: queryKeys.billing.limits });
		},
	});
}

// Create checkout session (for new subscriptions)
export function useCreateCheckout() {
	return useMutation({
		mutationFn: async (input: CreateCheckoutInput) => {
			const response = await api.post<ApiResponse<CheckoutSession>>(
				"/api/billing/checkout",
				input,
			);
			return response.data;
		},
	});
}

// Cancel subscription
export function useCancelSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (options?: { cancelImmediately?: boolean }) => {
			const response = await api.post<ApiResponse<Subscription>>(
				"/api/billing/cancel",
				options,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription,
			});
		},
	});
}

// Resume subscription (if canceled but not yet ended)
export function useResumeSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const response =
				await api.post<ApiResponse<Subscription>>("/api/billing/resume");
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.billing.subscription,
			});
		},
	});
}

// Get billing portal URL
export function useCreateBillingPortal() {
	return useMutation({
		mutationFn: async (returnUrl?: string) => {
			const response = await api.post<ApiResponse<BillingPortalSession>>(
				"/api/billing/portal",
				{
					returnUrl,
				},
			);
			return response.data;
		},
	});
}

// Update payment method
export function useUpdatePaymentMethod() {
	return useMutation({
		mutationFn: async () => {
			const response = await api.post<ApiResponse<{ url: string }>>(
				"/api/billing/update-payment",
			);
			return response.data;
		},
	});
}
