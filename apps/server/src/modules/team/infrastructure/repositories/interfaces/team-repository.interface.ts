// ============================================
// TEAM REPOSITORY INTERFACE
// ============================================

import type {
	TeamEntity,
	TeamMemberEntity,
	TeamWithMembers,
} from "../../../domain/entities/team.entity.js";

// ============================================
// Query Options
// ============================================

export interface TeamQueryOptions {
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: "name" | "createdAt" | "updatedAt";
	sortOrder?: "asc" | "desc";
}

export interface TeamQueryResult {
	teams: TeamEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface TeamMemberQueryOptions {
	page?: number;
	limit?: number;
	search?: string;
}

export interface TeamMemberQueryResult {
	members: Array<
		TeamMemberEntity & {
			organizationMember: {
				id: string;
				userId: string;
				user: {
					id: string;
					name: string | null;
					email: string;
					image: string | null;
				};
			};
			teamRole: { id: string; name: string } | null;
		}
	>;
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ============================================
// Team Repository Interface
// ============================================

export interface ITeamRepository {
	// Team CRUD
	create(data: {
		name: string;
		description?: string | null;
		organizationId: string;
	}): Promise<TeamEntity>;

	findById(id: string): Promise<TeamEntity | null>;

	findByIdWithMembers(id: string): Promise<TeamWithMembers | null>;

	findByOrganization(
		organizationId: string,
		options?: TeamQueryOptions,
	): Promise<TeamQueryResult>;

	findByUser(userId: string, organizationId: string): Promise<TeamEntity[]>;

	update(
		id: string,
		data: Partial<Pick<TeamEntity, "name" | "description">>,
	): Promise<TeamEntity>;

	delete(id: string): Promise<void>;

	nameExists(
		name: string,
		organizationId: string,
		excludeId?: string,
	): Promise<boolean>;
}

// ============================================
// Team Member Repository Interface
// ============================================

export interface ITeamMemberRepository {
	getMembers(
		teamId: string,
		options?: TeamMemberQueryOptions,
	): Promise<TeamMemberQueryResult>;

	getMember(
		teamId: string,
		organizationMemberId: string,
	): Promise<TeamMemberEntity | null>;

	getMemberByUserId(
		teamId: string,
		userId: string,
	): Promise<TeamMemberEntity | null>;

	addMember(data: {
		teamId: string;
		organizationMemberId: string;
		teamRoleId?: string | null;
	}): Promise<TeamMemberEntity>;

	updateMemberRole(
		teamId: string,
		organizationMemberId: string,
		teamRoleId: string | null,
	): Promise<void>;

	removeMember(teamId: string, organizationMemberId: string): Promise<void>;

	isMember(teamId: string, userId: string): Promise<boolean>;

	countMembers(teamId: string): Promise<number>;
}
