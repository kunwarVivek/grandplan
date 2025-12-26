import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	Project,
	ProjectMember,
	ProjectStats,
	CreateProjectInput,
	UpdateProjectInput,
} from "../types";

// Types for API responses
type ProjectsResponse = {
	projects: Project[];
	total: number;
};

type ProjectResponse = Project;

type MembersResponse = {
	members: ProjectMember[];
};

type StatsResponse = ProjectStats;

// Fetch all projects (optionally filtered by workspace)
export function useProjects(workspaceId?: string) {
	return useQuery({
		queryKey: queryKeys.projects.all(workspaceId),
		queryFn: async ({ signal }) => {
			const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
			return api.get<ProjectsResponse>(`/api/projects${params}`, signal);
		},
	});
}

// Fetch a single project
export function useProject(projectId: string) {
	return useQuery({
		queryKey: queryKeys.projects.detail(projectId),
		queryFn: async ({ signal }) => {
			return api.get<ProjectResponse>(`/api/projects/${projectId}`, signal);
		},
		enabled: !!projectId,
	});
}

// Create a new project
export function useCreateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateProjectInput) => {
			return api.post<ProjectResponse>("/api/projects", input);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(data.workspaceId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(),
			});
		},
	});
}

// Update a project
export function useUpdateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			...input
		}: UpdateProjectInput & { projectId: string }) => {
			return api.patch<ProjectResponse>(`/api/projects/${projectId}`, input);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.projects.detail(data.id), data);
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(data.workspaceId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(),
			});
		},
	});
}

// Delete a project
export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
		}: {
			projectId: string;
			workspaceId?: string;
		}) => {
			return api.delete<void>(`/api/projects/${projectId}`);
		},
		onSuccess: (_, variables) => {
			queryClient.removeQueries({
				queryKey: queryKeys.projects.detail(variables.projectId),
			});
			if (variables.workspaceId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.projects.all(variables.workspaceId),
				});
			}
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(),
			});
		},
	});
}

// Fetch project stats
export function useProjectStats(projectId: string) {
	return useQuery({
		queryKey: queryKeys.projects.stats(projectId),
		queryFn: async ({ signal }) => {
			return api.get<StatsResponse>(
				`/api/projects/${projectId}/stats`,
				signal,
			);
		},
		enabled: !!projectId,
	});
}

// Fetch project members
export function useProjectMembers(projectId: string) {
	return useQuery({
		queryKey: ["projects", projectId, "members"] as const,
		queryFn: async ({ signal }) => {
			return api.get<MembersResponse>(
				`/api/projects/${projectId}/members`,
				signal,
			);
		},
		enabled: !!projectId,
	});
}

// Add a member to the project
export function useAddProjectMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			userId,
			role,
		}: {
			projectId: string;
			userId: string;
			role: "lead" | "member" | "viewer";
		}) => {
			return api.post<ProjectMember>(`/api/projects/${projectId}/members`, {
				userId,
				role,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["projects", variables.projectId, "members"],
			});
		},
	});
}

// Remove a member from the project
export function useRemoveProjectMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			memberId,
		}: {
			projectId: string;
			memberId: string;
		}) => {
			return api.delete<void>(
				`/api/projects/${projectId}/members/${memberId}`,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["projects", variables.projectId, "members"],
			});
		},
	});
}

// Archive a project
export function useArchiveProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: string) => {
			return api.post<ProjectResponse>(`/api/projects/${projectId}/archive`);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.projects.detail(data.id), data);
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(),
			});
		},
	});
}

// Duplicate a project
export function useDuplicateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			name,
		}: {
			projectId: string;
			name?: string;
		}) => {
			return api.post<ProjectResponse>(
				`/api/projects/${projectId}/duplicate`,
				{ name },
			);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(data.workspaceId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.all(),
			});
		},
	});
}
