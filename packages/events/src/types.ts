// ============================================
// EVENT TYPE DEFINITIONS
// ============================================

import type { TaskStatusType } from "@grandplan/core/types";

export interface DomainEvent<T = unknown> {
	id: string;
	type: string;
	aggregateId: string;
	aggregateType: string;
	payload: T;
	metadata: EventMetadata;
}

export interface EventMetadata {
	userId?: string;
	organizationId?: string;
	workspaceId?: string;
	correlationId?: string;
	timestamp: Date;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
	handle(event: T): Promise<void>;
}

// Task Events
export interface TaskCreatedPayload {
	id: string;
	title: string;
	nodeType: string;
	projectId: string;
	parentId?: string;
	createdById: string;
}

export interface TaskUpdatedPayload {
	taskId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById?: string;
}

export interface TaskStatusChangedPayload {
	taskId: string;
	previousStatus: TaskStatusType;
	newStatus: TaskStatusType;
	reason?: string;
	changedById?: string;
	aiTriggered?: boolean;
}

export interface TaskAssignedPayload {
	taskId: string;
	assigneeId: string;
	previousAssigneeId?: string | null;
	assignedById: string;
}

export interface TaskDecomposedPayload {
	id: string;
	subtaskIds: string[];
	aiDecisionId: string;
}

export interface TaskCompletedPayload {
	id: string;
	completedAt: Date;
}

// Comment Events
export interface CommentCreatedPayload {
	id: string;
	taskId: string;
	authorId?: string;
	content: string;
}

// User/Presence Events
export interface UserMentionedPayload {
	userId: string;
	mentionedById: string;
	resourceType: "task" | "comment";
	resourceId: string;
	preview: string;
}

// Integration Events
export interface IntegrationSyncPayload {
	integrationId: string;
	userId: string;
	direction: "toExternal" | "fromExternal";
	itemsSynced: number;
	errors?: string[];
}

// Notification Events
export interface NotificationCreatedPayload {
	id: string;
	userId: string;
	type: string;
	title: string;
}

// Task move/dependency events
export interface TaskMovedPayload {
	taskId: string;
	previousParentId: string | null;
	newParentId: string | null;
	previousPath: string;
	newPath: string;
	movedById: string;
}

export interface DependencyAddedPayload {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	createdById: string;
}

export interface DependencyRemovedPayload {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	removedById: string;
}

export interface TaskCommentAddedPayload {
	commentId: string;
	taskId: string;
	authorId: string | null;
	content: string;
}

export interface TaskCommentUpdatedPayload {
	commentId: string;
	taskId: string;
	content: string;
	updatedById: string;
}

export interface TaskCommentDeletedPayload {
	commentId: string;
	taskId: string;
	deletedById: string;
}

export interface ChildrenCompletedPayload {
	parentTaskId: string;
	completedChildIds: string[];
	triggeredById: string;
}

export interface DependencyBlockedPayload {
	blockedTaskId: string;
	blockingTaskId: string;
	dependencyType: string;
}

// Project Events
export interface ProjectCreatedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	createdById: string;
	createdAt: Date;
}

export interface ProjectUpdatedPayload {
	projectId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface ProjectStatusChangedPayload {
	projectId: string;
	previousStatus: string;
	newStatus: string;
	changedById: string;
}

export interface ProjectDeletedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	deletedById: string;
}

export interface ProjectArchivedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	archivedById: string;
}

// Event type map for type safety
export interface EventTypeMap {
	"task.created": DomainEvent<TaskCreatedPayload>;
	"task.updated": DomainEvent<TaskUpdatedPayload>;
	"task.statusChanged": DomainEvent<TaskStatusChangedPayload>;
	"task.assigned": DomainEvent<TaskAssignedPayload>;
	"task.unassigned": DomainEvent<{
		taskId: string;
		previousAssigneeId: string;
		unassignedById: string;
	}>;
	"task.decomposed": DomainEvent<TaskDecomposedPayload>;
	"task.completed": DomainEvent<TaskCompletedPayload>;
	"task.deleted": DomainEvent<{
		taskId: string;
		title: string;
		projectId: string;
		deletedById: string;
	}>;
	"task.moved": DomainEvent<TaskMovedPayload>;
	"task.dependencyAdded": DomainEvent<DependencyAddedPayload>;
	"task.dependencyRemoved": DomainEvent<DependencyRemovedPayload>;
	"task.commentAdded": DomainEvent<TaskCommentAddedPayload>;
	"task.commentUpdated": DomainEvent<TaskCommentUpdatedPayload>;
	"task.commentDeleted": DomainEvent<TaskCommentDeletedPayload>;
	"task.childrenCompleted": DomainEvent<ChildrenCompletedPayload>;
	"task.dependencyBlocked": DomainEvent<DependencyBlockedPayload>;
	"comment.created": DomainEvent<CommentCreatedPayload>;
	"comment.updated": DomainEvent<{
		id: string;
		taskId: string;
		content: string;
	}>;
	"comment.deleted": DomainEvent<{ id: string; taskId: string }>;
	"user.mentioned": DomainEvent<UserMentionedPayload>;
	"integration.connected": DomainEvent<{
		integrationId: string;
		userId: string;
	}>;
	"integration.disconnected": DomainEvent<{
		integrationId: string;
		userId: string;
	}>;
	"integration.syncCompleted": DomainEvent<IntegrationSyncPayload>;
	"integration.syncFailed": DomainEvent<{
		integrationId: string;
		error: string;
	}>;
	"notification.created": DomainEvent<NotificationCreatedPayload>;
	"notification.read": DomainEvent<{ id: string; userId: string }>;
	"project.created": DomainEvent<ProjectCreatedPayload>;
	"project.updated": DomainEvent<ProjectUpdatedPayload>;
	"project.statusChanged": DomainEvent<ProjectStatusChangedPayload>;
	"project.deleted": DomainEvent<ProjectDeletedPayload>;
	"project.archived": DomainEvent<ProjectArchivedPayload>;
}

export type EventType = keyof EventTypeMap;
