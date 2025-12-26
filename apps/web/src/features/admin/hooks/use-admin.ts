import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	PlatformUser,
	PlatformOrganization,
	PlatformPlan,
	PlatformStats,
	SystemHealth,
	AuditLogEntry,
	PlatformUsersFilters,
	PlatformOrganizationsFilters,
	AuditLogsFilters,
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
function buildQueryParams(
	filters: Record<string, unknown>
): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null && value !== "") {
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
// Platform Users
// ============================================

export function usePlatformUsers(filters: PlatformUsersFilters = {}) {
	return useQuery({
		queryKey: [...queryKeys.platform.users, filters],
		queryFn: async ({ signal }) => {
			const query = buildQueryParams(filters);
			return api.get<PaginatedResponse<PlatformUser>>(
				`/api/admin/users${query}`,
				signal
			);
		},
	});
}

export function usePlatformUser(id: string) {
	return useQuery({
		queryKey: queryKeys.platform.userDetail(id),
		queryFn: async ({ signal }) => {
			return api.get<PlatformUser>(`/api/admin/users/${id}`, signal);
		},
		enabled: !!id,
	});
}

export function useUpdateUserStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			status,
		}: {
			userId: string;
			status: PlatformUser["status"];
		}) => {
			return api.patch<PlatformUser>(`/api/admin/users/${userId}/status`, {
				status,
			});
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.platform.userDetail(data.id), data);
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useUpdateUserRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			role,
		}: {
			userId: string;
			role: PlatformUser["role"];
		}) => {
			return api.patch<PlatformUser>(`/api/admin/users/${userId}/role`, {
				role,
			});
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.platform.userDetail(data.id), data);
			queryClient.invalidateQueries({ queryKey: queryKeys.platform.users });
		},
	});
}

export function useImpersonateUser() {
	return useMutation({
		mutationFn: async (userId: string) => {
			return api.post<ImpersonateResponse>(
				`/api/admin/users/${userId}/impersonate`
			);
		},
	});
}

// ============================================
// Platform Organizations
// ============================================

export function usePlatformOrganizations(
	filters: PlatformOrganizationsFilters = {}
) {
	return useQuery({
		queryKey: [...queryKeys.platform.organizations, filters],
		queryFn: async ({ signal }) => {
			const query = buildQueryParams(filters);
			return api.get<PaginatedResponse<PlatformOrganization>>(
				`/api/admin/organizations${query}`,
				signal
			);
		},
	});
}

export function usePlatformOrganization(id: string) {
	return useQuery({
		queryKey: queryKeys.platform.orgDetail(id),
		queryFn: async ({ signal }) => {
			return api.get<PlatformOrganization>(
				`/api/admin/organizations/${id}`,
				signal
			);
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
				{ status }
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
		mutationFn: async (
			input: Omit<PlatformPlan, "id" | "subscriberCount">
		) => {
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
				signal
			);
		},
	});
}
