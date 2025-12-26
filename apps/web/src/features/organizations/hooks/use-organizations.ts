import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	Organization,
	OrganizationMember,
	Invitation,
	CreateOrganizationInput,
	UpdateOrganizationInput,
	InviteMemberInput,
} from "../types";

// Types for API responses
type OrganizationsResponse = {
	organizations: Organization[];
};

type OrganizationResponse = Organization;

type MembersResponse = {
	members: OrganizationMember[];
};

type InvitationsResponse = {
	invitations: Invitation[];
};

// Fetch all organizations for the current user
export function useOrganizations() {
	return useQuery({
		queryKey: queryKeys.organizations.all,
		queryFn: async ({ signal }) => {
			return api.get<OrganizationsResponse>("/api/organizations", signal);
		},
	});
}

// Fetch a single organization
export function useOrganization(organizationId: string) {
	return useQuery({
		queryKey: queryKeys.organizations.detail(organizationId),
		queryFn: async ({ signal }) => {
			return api.get<OrganizationResponse>(
				`/api/organizations/${organizationId}`,
				signal,
			);
		},
		enabled: !!organizationId,
	});
}

// Create a new organization
export function useCreateOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateOrganizationInput) => {
			return api.post<OrganizationResponse>("/api/organizations", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.all,
			});
		},
	});
}

// Update an organization
export function useUpdateOrganization() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			...input
		}: UpdateOrganizationInput & { organizationId: string }) => {
			return api.patch<OrganizationResponse>(
				`/api/organizations/${organizationId}`,
				input,
			);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(
				queryKeys.organizations.detail(data.id),
				data,
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.all,
			});
		},
	});
}

// Fetch organization members
export function useOrganizationMembers(organizationId: string) {
	return useQuery({
		queryKey: queryKeys.organizations.members(organizationId),
		queryFn: async ({ signal }) => {
			return api.get<MembersResponse>(
				`/api/organizations/${organizationId}/members`,
				signal,
			);
		},
		enabled: !!organizationId,
	});
}

// Invite a member to the organization
export function useInviteMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			...input
		}: InviteMemberInput & { organizationId: string }) => {
			return api.post<Invitation>(
				`/api/organizations/${organizationId}/invitations`,
				input,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.invitations(variables.organizationId),
			});
		},
	});
}

// Remove a member from the organization
export function useRemoveMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			memberId,
		}: {
			organizationId: string;
			memberId: string;
		}) => {
			return api.delete<void>(
				`/api/organizations/${organizationId}/members/${memberId}`,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.members(variables.organizationId),
			});
		},
	});
}

// Fetch organization invitations
export function useOrganizationInvitations(organizationId: string) {
	return useQuery({
		queryKey: queryKeys.organizations.invitations(organizationId),
		queryFn: async ({ signal }) => {
			return api.get<InvitationsResponse>(
				`/api/organizations/${organizationId}/invitations`,
				signal,
			);
		},
		enabled: !!organizationId,
	});
}

// Cancel an invitation
export function useCancelInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			invitationId,
		}: {
			organizationId: string;
			invitationId: string;
		}) => {
			return api.delete<void>(
				`/api/organizations/${organizationId}/invitations/${invitationId}`,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.invitations(variables.organizationId),
			});
		},
	});
}

// Update member role
export function useUpdateMemberRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			organizationId,
			memberId,
			role,
		}: {
			organizationId: string;
			memberId: string;
			role: "admin" | "member";
		}) => {
			return api.patch<OrganizationMember>(
				`/api/organizations/${organizationId}/members/${memberId}`,
				{ role },
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.members(variables.organizationId),
			});
		},
	});
}
