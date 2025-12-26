// ============================================
// EVENT TYPE DEFINITIONS
// ============================================

import type { TaskPriorityType, TaskStatusType } from "@grandplan/core/types";

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
	id: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
}

export interface TaskStatusChangedPayload {
	id: string;
	previousStatus: TaskStatusType;
	newStatus: TaskStatusType;
	reason?: string;
}

export interface TaskAssignedPayload {
	id: string;
	assigneeId: string;
	previousAssigneeId?: string;
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

// Event type map for type safety
export interface EventTypeMap {
	"task.created": DomainEvent<TaskCreatedPayload>;
	"task.updated": DomainEvent<TaskUpdatedPayload>;
	"task.statusChanged": DomainEvent<TaskStatusChangedPayload>;
	"task.assigned": DomainEvent<TaskAssignedPayload>;
	"task.unassigned": DomainEvent<{ id: string; previousAssigneeId: string }>;
	"task.decomposed": DomainEvent<TaskDecomposedPayload>;
	"task.completed": DomainEvent<TaskCompletedPayload>;
	"task.deleted": DomainEvent<{ id: string; projectId: string }>;
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
}

export type EventType = keyof EventTypeMap;
