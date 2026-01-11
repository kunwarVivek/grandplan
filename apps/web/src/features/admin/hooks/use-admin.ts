import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	AuditLogEntry,
	AuditLogsFilters,
	DateRange,
	GrowthMetrics,
	OverviewMetrics,
	PlatformOrganization,
	PlatformOrganizationsFilters,
	PlatformPlan,
	PlatformStats,
	PlatformUser,
	PlatformUsersFilters,
	RevenueMetrics,
	SystemHealth,
	UsageMetrics,
} from "../types";

// API response types
type PaginatedResponse<T> = {
	items: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

type ImpersonateResponse = {
	token: string;
	expiresAt: Date;
};

// Helper to build query params
function buildQueryParams(filters: Record<string, unknown>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		// Skip undefined, null, empty, and "all" values (used by UI for "no filter")
		if (value !== undefined && value !== null && value !== "" && value !== "all") {
			if (value instanceof Date) {
				params.set(key, value.toISOString());
			} else {
				params.set(key, String(value));
			}
		}
	}
	const queryString = params.toString();
	return queryString ? `?${queryString}` : "";
}

// ============================================
// Platform Users API Response Types
// ============================================

type ListUsersResponse = {
	success: boolean;
	data: PlatformUser[];
	meta: {
		total: number;
		limit: number;
		offset: number;
	};
};

type UserDetailResponse = {
	success: boolean;
	data: PlatformUser;
};

type MutationResponse = {
	success: boolean;
	message: string;
};

// ============================================
// Platform Users
// ============================================

export function usePlatformUsers(filters: PlatformUsersFilters = {}) {
	return useQuery({
		queryKey: [...queryKeys.platform.users, filters],
		queryFn: async ({ signal }) => {
			const query = buildQueryParams({
				search: filters.search,
				status: filters.status,
				limit: filters.limit ?? 20,
				offset: filters.page ? (filters.page - 1) * (filters.limit ?? 20) : 0,
			});
			const response = await api.get<ListUsersResponse>(
				`/api/platform/users${query}`,
				signal,
			);
			return {
				items: response.data,
				total: response.meta.total,
				page: Math.floor(response.meta.offset / response.meta.limit) + 1,
				limit: response.meta.limit,
				totalPages: Math.ceil(response.meta.total / response.meta.limit),
			};
		},
	});
}

export function usePlatformUser(id: string) {
	return useQuery({
		queryKey: queryKeys.platform.userDetail(id),
		queryFn: async ({ signal }) => {
			const response = await api.get<UserDetailResponse>(
				`/api/platform/users/${id}`,
				signal,
			);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useUpdateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			data,
		}: {
			userId: string;
			data: { name?: string; email?: string };
		}) => {
			return api.patch<MutationResponse>(`/api/platform/users/${userId}`, data);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.userDetail(variables.userId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useBanUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			reason,
			expiresAt,
		}: {
			userId: string;
			reason: string;
			expiresAt?: string;
		}) => {
			return api.post<MutationResponse>(`/api/platform/users/${userId}/ban`, {
				reason,
				expiresAt,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.userDetail(variables.userId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useUnbanUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.post<MutationResponse>(`/api/platform/users/${userId}/unban`);
		},
		onSuccess: (_, userId) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.userDetail(userId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.delete<MutationResponse>(`/api/platform/users/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useImpersonateUser() {
	return useMutation({
		mutationFn: async (userId: string) => {
			return api.post<ImpersonateResponse>(
				`/api/platform/users/${userId}/impersonate`,
			);
		},
	});
}

export function useUserActivity(userId: string, limit = 50) {
	return useQuery({
		queryKey: [...queryKeys.platform.userDetail(userId), "activity"],
		queryFn: async ({ signal }) => {
			const response = await api.get<{
				success: boolean;
				data: Array<{
					id: string;
					action: string;
					timestamp: string;
					metadata?: Record<string, unknown>;
				}>;
			}>(`/api/platform/users/${userId}/activity?limit=${limit}`, signal);
			return response.data;
		},
		enabled: !!userId,
	});
}

// ============================================
// Platform Organizations
// ============================================

// API response from /api/platform/organizations
type PlatformOrganizationsResponse = {
	success: boolean;
	data: PlatformOrganization[];
	meta: {
		total: number;
		limit: number;
		offset: number;
	};
};

export function usePlatformOrganizations(
	filters: PlatformOrganizationsFilters = {},
) {
	return useQuery({
		queryKey: [...queryKeys.platform.organizations, filters],
		queryFn: async ({ signal }) => {
			const query = buildQueryParams({
				search: filters.search,
				status: filters.status,
				planId: filters.plan,
				limit: filters.limit ?? 10,
				offset: filters.page ? (filters.page - 1) * (filters.limit ?? 10) : 0,
			});
			return api.get<PlatformOrganizationsResponse>(
				`/api/platform/organizations${query}`,
				signal,
			);
		},
	});
}

export function usePlatformOrganization(id: string) {
	return useQuery({
		queryKey: queryKeys.platform.orgDetail(id),
		queryFn: async ({ signal }) => {
			const response = await api.get<{ success: boolean; data: PlatformOrganization }>(
				`/api/platform/organizations/${id}`,
				signal,
			);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useUpdateOrgStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			status,
		}: {
			organizationId: string;
			status: PlatformOrganization["status"];
		}) => {
			return api.patch<PlatformOrganization>(
				`/api/admin/organizations/${organizationId}/status`,
				{ status },
			);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.platform.orgDetail(data.id), data);
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.organizations,
			});
		},
	});
}

export function useUpdateOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			...data
		}: {
			organizationId: string;
			name?: string;
			slug?: string;
		}) => {
			return api.patch<{ success: boolean; message: string }>(
				`/api/platform/organizations/${organizationId}`,
				data,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.orgDetail(variables.organizationId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.organizations,
			});
		},
	});
}

export function useSuspendOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			reason,
		}: {
			organizationId: string;
			reason: string;
		}) => {
			return api.post<{ success: boolean; message: string }>(
				`/api/platform/organizations/${organizationId}/suspend`,
				{ reason },
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.orgDetail(variables.organizationId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.organizations,
			});
		},
	});
}

export function useUnsuspendOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (organizationId: string) => {
			return api.post<{ success: boolean; message: string }>(
				`/api/platform/organizations/${organizationId}/unsuspend`,
			);
		},
		onSuccess: (_, organizationId) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.orgDetail(organizationId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.organizations,
			});
		},
	});
}

export function useDeleteOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (organizationId: string) => {
			return api.delete<{ success: boolean; message: string }>(
				`/api/platform/organizations/${organizationId}`,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.platform.organizations,
			});
		},
	});
}

// ============================================
// Platform Plans
// ============================================

export function usePlatformPlans() {
	return useQuery({
		queryKey: queryKeys.platform.plans,
		queryFn: async ({ signal }) => {
			return api.get<{ plans: PlatformPlan[] }>("/api/admin/plans", signal);
		},
	});
}

export function useCreatePlan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: Omit<PlatformPlan, "id" | "subscriberCount">) => {
			return api.post<PlatformPlan>("/api/admin/plans", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.plans });
		},
	});
}

export function useUpdatePlan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			planId,
			...input
		}: Partial<Omit<PlatformPlan, "id" | "subscriberCount">> & {
			planId: string;
		}) => {
			return api.patch<PlatformPlan>(`/api/admin/plans/${planId}`, input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.plans });
		},
	});
}

export function useDeletePlan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (planId: string) => {
			return api.delete<void>(`/api/admin/plans/${planId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.plans });
		},
	});
}

// ============================================
// Platform Stats & Analytics
// ============================================

export function usePlatformStats() {
	return useQuery({
		queryKey: queryKeys.platform.analytics,
		queryFn: async ({ signal }) => {
			return api.get<PlatformStats>("/api/admin/stats", signal);
		},
		// Refresh stats every 5 minutes
		refetchInterval: 5 * 60 * 1000,
	});
}

// ============================================
// NEW Analytics API Hooks
// ============================================

type ApiResponse<T> = {
	success: boolean;
	data: T;
};

/**
 * Get platform overview metrics including user/org counts and growth percentages
 */
export function useAnalyticsOverview(dateRange?: DateRange) {
	return useQuery({
		queryKey: [...queryKeys.platform.analyticsOverview, dateRange],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
			if (dateRange?.endDate) params.set("endDate", dateRange.endDate);
			const query = params.toString() ? `?${params.toString()}` : "";

			const response = await api.get<ApiResponse<OverviewMetrics>>(
				`/api/platform/analytics/overview${query}`,
				signal,
			);
			return response.data;
		},
		refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
	});
}

/**
 * Get revenue metrics including MRR, ARR, churn rate, and revenue history
 */
export function useAnalyticsRevenue(dateRange?: DateRange) {
	return useQuery({
		queryKey: [...queryKeys.platform.analyticsRevenue, dateRange],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
			if (dateRange?.endDate) params.set("endDate", dateRange.endDate);
			const query = params.toString() ? `?${params.toString()}` : "";

			const response = await api.get<ApiResponse<RevenueMetrics>>(
				`/api/platform/analytics/revenue${query}`,
				signal,
			);
			return response.data;
		},
		refetchInterval: 5 * 60 * 1000,
	});
}

/**
 * Get usage metrics including active sessions, task counts, and top organizations
 */
export function useAnalyticsUsage(dateRange?: DateRange) {
	return useQuery({
		queryKey: [...queryKeys.platform.analyticsUsage, dateRange],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
			if (dateRange?.endDate) params.set("endDate", dateRange.endDate);
			const query = params.toString() ? `?${params.toString()}` : "";

			const response = await api.get<ApiResponse<UsageMetrics>>(
				`/api/platform/analytics/usage${query}`,
				signal,
			);
			return response.data;
		},
		refetchInterval: 5 * 60 * 1000,
	});
}

/**
 * Get growth metrics including signups, org creations, and retention cohorts
 */
export function useAnalyticsGrowth(dateRange?: DateRange) {
	return useQuery({
		queryKey: [...queryKeys.platform.analyticsGrowth, dateRange],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
			if (dateRange?.endDate) params.set("endDate", dateRange.endDate);
			const query = params.toString() ? `?${params.toString()}` : "";

			const response = await api.get<ApiResponse<GrowthMetrics>>(
				`/api/platform/analytics/growth${query}`,
				signal,
			);
			return response.data;
		},
		refetchInterval: 5 * 60 * 1000,
	});
}

// ============================================
// System Health
// ============================================

export function useSystemHealth() {
	return useQuery({
		queryKey: queryKeys.platform.system,
		queryFn: async ({ signal }) => {
			return api.get<SystemHealth>("/api/admin/health", signal);
		},
		// Refresh health status every 30 seconds
		refetchInterval: 30 * 1000,
	});
}

// ============================================
// Audit Logs
// ============================================

export function useAuditLogs(filters: AuditLogsFilters = {}) {
	return useQuery({
		queryKey: [...queryKeys.platform.analytics, "audit", filters],
		queryFn: async ({ signal }) => {
			const query = buildQueryParams(filters);
			return api.get<PaginatedResponse<AuditLogEntry>>(
				`/api/admin/audit-logs${query}`,
				signal,
			);
		},
	});
}
