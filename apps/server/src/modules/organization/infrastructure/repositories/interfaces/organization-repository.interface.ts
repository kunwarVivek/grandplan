// ============================================
// ORGANIZATION REPOSITORY INTERFACE
// ============================================

import type {
	InvitationStatus,
	MemberStatus,
	OrganizationStatus,
} from "@grandplan/db";
import type {
	BrandingConfig,
	OrganizationEntity,
	OrganizationInvitationEntity,
	OrganizationMemberEntity,
	OrganizationWithMembers,
} from "../../../domain/entities/organization.entity.js";

// ============================================
// Query Options
// ============================================

export interface OrganizationQueryOptions {
	page?: number;
	limit?: number;
	search?: string;
	status?: OrganizationStatus;
	sortBy?: "name" | "createdAt" | "updatedAt";
	sortOrder?: "asc" | "desc";
}

export interface OrganizationQueryResult {
	organizations: OrganizationEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface MemberQueryOptions {
	page?: number;
	limit?: number;
	search?: string;
	status?: MemberStatus;
	roleId?: string;
}

export interface MemberQueryResult {
	members: Array<
		OrganizationMemberEntity & {
			user: {
				id: string;
				name: string | null;
				email: string;
				image: string | null;
			};
			role: { id: string; name: string };
		}
	>;
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface InvitationQueryOptions {
	page?: number;
	limit?: number;
	status?: InvitationStatus;
}

export interface InvitationQueryResult {
	invitations: OrganizationInvitationEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ============================================
// Organization Repository Interface
// ============================================

export interface IOrganizationRepository {
	// Organization CRUD
	create(data: {
		name: string;
		slug: string;
		description?: string | null;
		logo?: string | null;
		createdById: string;
		initialRoleId: string;
	}): Promise<OrganizationEntity>;

	findById(id: string): Promise<OrganizationEntity | null>;

	findByIdWithMembers(id: string): Promise<OrganizationWithMembers | null>;

	findBySlug(slug: string): Promise<OrganizationEntity | null>;

	findByCustomDomain(domain: string): Promise<OrganizationEntity | null>;

	findAll(options?: OrganizationQueryOptions): Promise<OrganizationQueryResult>;

	update(
		id: string,
		data: Partial<
			Pick<
				OrganizationEntity,
				| "name"
				| "slug"
				| "description"
				| "logo"
				| "status"
				| "customDomain"
				| "brandingConfig"
			>
		>,
	): Promise<OrganizationEntity>;

	updateBranding(
		id: string,
		brandingConfig: BrandingConfig,
		customDomain?: string | null,
	): Promise<OrganizationEntity>;

	delete(id: string): Promise<void>;

	slugExists(slug: string, excludeId?: string): Promise<boolean>;

	customDomainExists(domain: string, excludeId?: string): Promise<boolean>;
}

// ============================================
// Member Repository Interface
// ============================================

export interface IMemberRepository {
	getMembers(
		organizationId: string,
		options?: MemberQueryOptions,
	): Promise<MemberQueryResult>;

	getMember(
		organizationId: string,
		userId: string,
	): Promise<OrganizationMemberEntity | null>;

	addMember(data: {
		organizationId: string;
		userId: string;
		roleId: string;
		invitedById?: string;
	}): Promise<OrganizationMemberEntity>;

	updateMemberRole(
		organizationId: string,
		userId: string,
		roleId: string,
	): Promise<void>;

	updateMemberStatus(
		organizationId: string,
		userId: string,
		status: MemberStatus,
	): Promise<void>;

	removeMember(organizationId: string, userId: string): Promise<void>;

	countMembers(organizationId: string): Promise<number>;
}

// ============================================
// Invitation Repository Interface
// ============================================

export interface IInvitationRepository {
	createInvitation(data: {
		organizationId: string;
		email: string;
		roleId: string;
		teamId?: string | null;
		invitedById: string;
		expiresInDays?: number;
	}): Promise<OrganizationInvitationEntity>;

	getInvitations(
		organizationId: string,
		options?: InvitationQueryOptions,
	): Promise<InvitationQueryResult>;

	findInvitationByToken(
		token: string,
	): Promise<OrganizationInvitationEntity | null>;

	findInvitationByEmail(
		organizationId: string,
		email: string,
	): Promise<OrganizationInvitationEntity | null>;

	updateInvitationStatus(id: string, status: InvitationStatus): Promise<void>;

	deleteInvitation(id: string): Promise<void>;

	expireOldInvitations(): Promise<number>;
}
