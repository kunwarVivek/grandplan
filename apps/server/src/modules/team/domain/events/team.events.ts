// ============================================
// TEAM DOMAIN EVENTS
// ============================================

export interface TeamCreatedEvent {
	teamId: string;
	name: string;
	organizationId: string;
	createdById: string;
	createdAt: Date;
}

export interface TeamUpdatedEvent {
	teamId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface TeamDeletedEvent {
	teamId: string;
	name: string;
	organizationId: string;
	deletedById: string;
}

export interface TeamMemberAddedEvent {
	teamId: string;
	organizationMemberId: string;
	userId: string;
	teamRoleId: string | null;
	addedById: string;
}

export interface TeamMemberRemovedEvent {
	teamId: string;
	organizationMemberId: string;
	userId: string;
	removedById: string;
}

export interface TeamMemberRoleChangedEvent {
	teamId: string;
	organizationMemberId: string;
	userId: string;
	previousRoleId: string | null;
	newRoleId: string | null;
	changedById: string;
}

export const TEAM_EVENTS = {
	CREATED: "team.created",
	UPDATED: "team.updated",
	DELETED: "team.deleted",
	MEMBER_ADDED: "team.memberAdded",
	MEMBER_REMOVED: "team.memberRemoved",
	MEMBER_ROLE_CHANGED: "team.memberRoleChanged",
} as const;
