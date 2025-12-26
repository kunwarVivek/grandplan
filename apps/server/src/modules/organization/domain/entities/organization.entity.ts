// ============================================
// ORGANIZATION ENTITY
// ============================================

import type {
	InvitationStatus,
	MemberStatus,
	OrganizationStatus,
} from "@prisma/client";

export interface OrganizationEntity {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	logo: string | null;
	status: OrganizationStatus;
	customDomain: string | null;
	brandingConfig: BrandingConfig | null;
	polarCustomerId: string | null;
	stripeCustomerId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface BrandingConfig {
	primaryColor?: string;
	secondaryColor?: string;
	fontFamily?: string;
	logo?: string;
	favicon?: string;
}

export interface OrganizationMemberEntity {
	id: string;
	userId: string;
	organizationId: string;
	roleId: string;
	status: MemberStatus;
	joinedAt: Date;
	invitedById: string | null;
}

export interface OrganizationWithMembers extends OrganizationEntity {
	members: Array<
		OrganizationMemberEntity & {
			user: {
				id: string;
				name: string | null;
				email: string;
				image: string | null;
			};
			role: {
				id: string;
				name: string;
			};
		}
	>;
	_count: {
		members: number;
		teams: number;
		workspaces: number;
	};
}

export interface OrganizationInvitationEntity {
	id: string;
	email: string;
	organizationId: string;
	roleId: string;
	teamId: string | null;
	token: string;
	status: InvitationStatus;
	expiresAt: Date;
	invitedById: string;
	createdAt: Date;
}

export const ORGANIZATION_STATUSES = [
	"PENDING",
	"ACTIVE",
	"SUSPENDED",
	"CANCELLED",
] as const;
export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export const INVITATION_STATUSES = [
	"PENDING",
	"ACCEPTED",
	"EXPIRED",
	"REVOKED",
] as const;

export function isOrganizationActive(status: OrganizationStatus): boolean {
	return status === "ACTIVE";
}

export function isMemberActive(status: MemberStatus): boolean {
	return status === "ACTIVE";
}

export function isInvitationPending(status: InvitationStatus): boolean {
	return status === "PENDING";
}

export function isInvitationExpired(
	invitation: OrganizationInvitationEntity,
): boolean {
	return invitation.status === "EXPIRED" || new Date() > invitation.expiresAt;
}
