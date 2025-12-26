import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	Workspace,
	WorkspaceMember,
	CreateWorkspaceInput,
	UpdateWorkspaceInput,
} from "../types";

// Types for API responses
type WorkspacesResponse = {
	workspaces: Workspace[];
};

type WorkspaceResponse = Workspace;

type MembersResponse = {
	members: WorkspaceMember[];
};

// Fetch all workspaces for the current organization
export function useWorkspaces(organizationId?: string) {
	return useQuery({
		queryKey: queryKeys.workspaces.all,
		queryFn: async ({ signal }) => {
			const params = organizationId
				? `?organizationId=${organizationId}`
				: "";
			return api.get<WorkspacesResponse>(`/api/workspaces${params}`, signal);
		},
	});
}

// Fetch a single workspace
export function useWorkspace(workspaceId: string) {
	return useQuery({
		queryKey: queryKeys.workspaces.detail(workspaceId),
		queryFn: async ({ signal }) => {
			return api.get<WorkspaceResponse>(
				`/api/workspaces/${workspaceId}`,
				signal,
			);
		},
		enabled: !!workspaceId,
	});
}

// Create a new workspace
export function useCreateWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateWorkspaceInput) => {
			return api.post<WorkspaceResponse>("/api/workspaces", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.all,
			});
		},
	});
}

// Update a workspace
export function useUpdateWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			workspaceId,
			...input
		}: UpdateWorkspaceInput & { workspaceId: string }) => {
			return api.patch<WorkspaceResponse>(
				`/api/workspaces/${workspaceId}`,
				input,
			);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.workspaces.detail(data.id), data);
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.all,
			});
		},
	});
}

// Delete a workspace
export function useDeleteWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (workspaceId: string) => {
			return api.delete<void>(`/api/workspaces/${workspaceId}`);
		},
		onSuccess: (_, workspaceId) => {
			queryClient.removeQueries({
				queryKey: queryKeys.workspaces.detail(workspaceId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.all,
			});
		},
	});
}

// Fetch workspace members
export function useWorkspaceMembers(workspaceId: string) {
	return useQuery({
		queryKey: queryKeys.workspaces.members(workspaceId),
		queryFn: async ({ signal }) => {
			return api.get<MembersResponse>(
				`/api/workspaces/${workspaceId}/members`,
				signal,
			);
		},
		enabled: !!workspaceId,
	});
}

// Add a member to the workspace
export function useAddWorkspaceMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			workspaceId,
			userId,
			role,
		}: {
			workspaceId: string;
			userId: string;
			role: "admin" | "member" | "viewer";
		}) => {
			return api.post<WorkspaceMember>(
				`/api/workspaces/${workspaceId}/members`,
				{ userId, role },
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.members(variables.workspaceId),
			});
		},
	});
}

// Remove a member from the workspace
export function useRemoveWorkspaceMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			workspaceId,
			memberId,
		}: {
			workspaceId: string;
			memberId: string;
		}) => {
			return api.delete<void>(
				`/api/workspaces/${workspaceId}/members/${memberId}`,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.members(variables.workspaceId),
			});
		},
	});
}

// Update member role
export function useUpdateWorkspaceMemberRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			workspaceId,
			memberId,
			role,
		}: {
			workspaceId: string;
			memberId: string;
			role: "admin" | "member" | "viewer";
		}) => {
			return api.patch<WorkspaceMember>(
				`/api/workspaces/${workspaceId}/members/${memberId}`,
				{ role },
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.workspaces.members(variables.workspaceId),
			});
		},
	});
}
