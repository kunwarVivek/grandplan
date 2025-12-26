// ============================================
// WORKSPACE DOMAIN EVENTS
// ============================================

export interface WorkspaceCreatedEvent {
	workspaceId: string;
	name: string;
	slug: string;
	organizationId: string;
	ownerId: string;
	createdAt: Date;
}

export interface WorkspaceUpdatedEvent {
	workspaceId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface WorkspaceDeletedEvent {
	workspaceId: string;
	name: string;
	organizationId: string;
	deletedById: string;
}

export interface WorkspaceMemberAddedEvent {
	workspaceId: string;
	userId: string;
	role: string;
	addedById: string;
}

export interface WorkspaceMemberRemovedEvent {
	workspaceId: string;
	userId: string;
	removedById: string;
}

export interface WorkspaceMemberRoleChangedEvent {
	workspaceId: string;
	userId: string;
	previousRole: string;
	newRole: string;
	changedById: string;
}

export const WORKSPACE_EVENTS = {
	CREATED: "workspace.created",
	UPDATED: "workspace.updated",
	DELETED: "workspace.deleted",
	MEMBER_ADDED: "workspace.memberAdded",
	MEMBER_REMOVED: "workspace.memberRemoved",
	MEMBER_ROLE_CHANGED: "workspace.memberRoleChanged",
} as const;
