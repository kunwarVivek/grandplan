import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	CreateTeamInput,
	Team,
	TeamMember,
	TeamRole,
	UpdateTeamInput,
} from "../types";

// Types for API responses
type TeamsResponse = {
	teams: Team[];
};

type TeamResponse = Team;

type MembersResponse = {
	members: TeamMember[];
};

// Fetch all teams for the current organization
export function useTeams(organizationId?: string) {
	return useQuery({
		queryKey: queryKeys.teams.all,
		queryFn: async ({ signal }) => {
			const params = organizationId ? `?organizationId=${organizationId}` : "";
			return api.get<TeamsResponse>(`/api/teams${params}`, signal);
		},
	});
}

// Fetch teams the current user belongs to
export function useMyTeams() {
	return useQuery({
		queryKey: queryKeys.teams.myTeams,
		queryFn: async ({ signal }) => {
			return api.get<TeamsResponse>("/api/teams/my-teams", signal);
		},
	});
}

// Fetch a single team
export function useTeam(teamId: string) {
	return useQuery({
		queryKey: queryKeys.teams.detail(teamId),
		queryFn: async ({ signal }) => {
			return api.get<TeamResponse>(`/api/teams/${teamId}`, signal);
		},
		enabled: !!teamId,
	});
}

// Create a new team
export function useCreateTeam() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateTeamInput) => {
			return api.post<TeamResponse>("/api/teams", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.all,
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.myTeams,
			});
		},
	});
}

// Update a team
export function useUpdateTeam() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			teamId,
			...input
		}: UpdateTeamInput & { teamId: string }) => {
			return api.patch<TeamResponse>(`/api/teams/${teamId}`, input);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.teams.detail(data.id), data);
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.all,
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.myTeams,
			});
		},
	});
}

// Delete a team
export function useDeleteTeam() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (teamId: string) => {
			return api.delete<void>(`/api/teams/${teamId}`);
		},
		onSuccess: (_, teamId) => {
			queryClient.removeQueries({
				queryKey: queryKeys.teams.detail(teamId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.all,
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.myTeams,
			});
		},
	});
}

// Fetch team members
export function useTeamMembers(teamId: string) {
	return useQuery({
		queryKey: queryKeys.teams.members(teamId),
		queryFn: async ({ signal }) => {
			return api.get<MembersResponse>(`/api/teams/${teamId}/members`, signal);
		},
		enabled: !!teamId,
	});
}

// Add a member to the team
export function useAddTeamMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			teamId,
			userId,
			role = "member",
		}: {
			teamId: string;
			userId: string;
			role?: TeamRole;
		}) => {
			return api.post<TeamMember>(`/api/teams/${teamId}/members`, {
				userId,
				role,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.members(variables.teamId),
			});
		},
	});
}

// Remove a member from the team
export function useRemoveTeamMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			teamId,
			memberId,
		}: {
			teamId: string;
			memberId: string;
		}) => {
			return api.delete<void>(`/api/teams/${teamId}/members/${memberId}`);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.members(variables.teamId),
			});
		},
	});
}

// Update team member role
export function useUpdateTeamMemberRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			teamId,
			memberId,
			role,
		}: {
			teamId: string;
			memberId: string;
			role: TeamRole;
		}) => {
			return api.patch<TeamMember>(`/api/teams/${teamId}/members/${memberId}`, {
				role,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.teams.members(variables.teamId),
			});
		},
	});
}
