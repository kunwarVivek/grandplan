// ============================================
// PROJECT DOMAIN EVENTS
// ============================================

export interface ProjectCreatedEvent {
	projectId: string;
	name: string;
	workspaceId: string;
	createdById: string;
	createdAt: Date;
}

export interface ProjectUpdatedEvent {
	projectId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface ProjectStatusChangedEvent {
	projectId: string;
	previousStatus: string;
	newStatus: string;
	changedById: string;
}

export interface ProjectDeletedEvent {
	projectId: string;
	name: string;
	workspaceId: string;
	deletedById: string;
}

export interface ProjectArchivedEvent {
	projectId: string;
	name: string;
	workspaceId: string;
	archivedById: string;
}

export const PROJECT_EVENTS = {
	CREATED: "project.created",
	UPDATED: "project.updated",
	STATUS_CHANGED: "project.statusChanged",
	DELETED: "project.deleted",
	ARCHIVED: "project.archived",
} as const;
