// ============================================
// ORGANIZATION DOMAIN EVENTS
// ============================================

export interface OrganizationCreatedEvent {
	organizationId: string;
	name: string;
	slug: string;
	createdById: string;
	createdAt: Date;
}

export interface OrganizationUpdatedEvent {
	organizationId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface OrganizationDeletedEvent {
	organizationId: string;
	name: string;
	deletedById: string;
}

export interface OrganizationStatusChangedEvent {
	organizationId: string;
	previousStatus: string;
	newStatus: string;
	changedById: string;
	reason?: string;
}

export interface MemberInvitedEvent {
	invitationId: string;
	organizationId: string;
	email: string;
	roleId: string;
	invitedById: string;
}

export interface MemberJoinedEvent {
	organizationId: string;
	userId: string;
	memberId: string;
	roleId: string;
	invitationId?: string;
}

export interface MemberRemovedEvent {
	organizationId: string;
	userId: string;
	memberId: string;
	removedById: string;
}

export interface MemberRoleChangedEvent {
	organizationId: string;
	userId: string;
	memberId: string;
	previousRoleId: string;
	newRoleId: string;
	changedById: string;
}

export interface InvitationRevokedEvent {
	invitationId: string;
	organizationId: string;
	email: string;
	revokedById: string;
}

export interface BrandingUpdatedEvent {
	organizationId: string;
	changes: Record<string, unknown>;
	updatedById: string;
}

export const ORGANIZATION_EVENTS = {
	CREATED: "organization.created",
	UPDATED: "organization.updated",
	DELETED: "organization.deleted",
	STATUS_CHANGED: "organization.statusChanged",
	MEMBER_INVITED: "organization.memberInvited",
	MEMBER_JOINED: "organization.memberJoined",
	MEMBER_REMOVED: "organization.memberRemoved",
	MEMBER_ROLE_CHANGED: "organization.memberRoleChanged",
	INVITATION_REVOKED: "organization.invitationRevoked",
	BRANDING_UPDATED: "organization.brandingUpdated",
} as const;
