import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	Integration,
	IntegrationConnection,
	IntegrationCategory,
	ConnectIntegrationInput,
	UpdateConnectionInput,
	SyncIntegrationInput,
	OAuthStartResponse,
	IntegrationProvider,
} from "../types";

// Fetch active connections
export function useIntegrations() {
	return useQuery({
		queryKey: queryKeys.integrations.connections,
		queryFn: async ({ signal }) => {
			return api.get<{ connections: IntegrationConnection[] }>(
				"/api/integrations/connections",
				signal
			);
		},
	});
}

// Fetch available integrations
export function useAvailableIntegrations(category?: IntegrationCategory) {
	return useQuery({
		queryKey: [...queryKeys.integrations.available, category],
		queryFn: async ({ signal }) => {
			const params = category ? `?category=${category}` : "";
			return api.get<{ integrations: Integration[] }>(
				`/api/integrations/available${params}`,
				signal
			);
		},
	});
}

// Fetch single connection details
export function useIntegrationConnection(connectionId: string) {
	return useQuery({
		queryKey: [...queryKeys.integrations.connections, connectionId],
		queryFn: async ({ signal }) => {
			return api.get<IntegrationConnection>(
				`/api/integrations/connections/${connectionId}`,
				signal
			);
		},
		enabled: !!connectionId,
	});
}

// Start OAuth flow
export function useStartOAuth() {
	return useMutation({
		mutationFn: async ({
			provider,
			redirectUrl,
		}: {
			provider: IntegrationProvider;
			redirectUrl?: string;
		}) => {
			return api.post<OAuthStartResponse>("/api/integrations/oauth/start", {
				provider,
				redirectUrl: redirectUrl ?? window.location.href,
			});
		},
	});
}

// Connect integration (complete OAuth or API key)
export function useConnectIntegration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: ConnectIntegrationInput) => {
			return api.post<IntegrationConnection>("/api/integrations/connect", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations.connections });
		},
	});
}

// Disconnect integration
export function useDisconnectIntegration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (connectionId: string) => {
			return api.delete<void>(`/api/integrations/connections/${connectionId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations.connections });
		},
	});
}

// Update connection settings
export function useUpdateConnection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			connectionId,
			...input
		}: UpdateConnectionInput & { connectionId: string }) => {
			return api.patch<IntegrationConnection>(
				`/api/integrations/connections/${connectionId}`,
				input
			);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(
				[...queryKeys.integrations.connections, data.id],
				data
			);
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations.connections });
		},
	});
}

// Trigger manual sync
export function useSyncIntegration() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: SyncIntegrationInput) => {
			return api.post<{ success: boolean; syncedAt: Date }>(
				`/api/integrations/connections/${input.connectionId}/sync`,
				{ fullSync: input.fullSync }
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [...queryKeys.integrations.connections, variables.connectionId],
			});
		},
	});
}

// Refresh expired token
export function useRefreshConnection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (connectionId: string) => {
			return api.post<IntegrationConnection>(
				`/api/integrations/connections/${connectionId}/refresh`
			);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(
				[...queryKeys.integrations.connections, data.id],
				data
			);
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations.connections });
		},
	});
}

// Test connection
export function useTestConnection() {
	return useMutation({
		mutationFn: async (connectionId: string) => {
			return api.post<{ success: boolean; message?: string }>(
				`/api/integrations/connections/${connectionId}/test`
			);
		},
	});
}
