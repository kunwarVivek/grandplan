// ============================================
// TASK DOMAIN EVENTS
// ============================================

export interface TaskCreatedEvent {
	taskId: string;
	title: string;
	nodeType: string;
	projectId: string;
	parentId: string | null;
	createdById: string;
	createdAt: Date;
}

export interface TaskUpdatedEvent {
	taskId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface TaskStatusChangedEvent {
	taskId: string;
	previousStatus: string;
	newStatus: string;
	reason?: string;
	changedById: string;
	aiTriggered: boolean;
}

export interface TaskAssignedEvent {
	taskId: string;
	assigneeId: string;
	previousAssigneeId: string | null;
	assignedById: string;
}

export interface TaskUnassignedEvent {
	taskId: string;
	previousAssigneeId: string;
	unassignedById: string;
}

export interface TaskMovedEvent {
	taskId: string;
	previousParentId: string | null;
	newParentId: string | null;
	previousPath: string;
	newPath: string;
	movedById: string;
}

export interface TaskDeletedEvent {
	taskId: string;
	title: string;
	projectId: string;
	deletedById: string;
}

export interface DependencyAddedEvent {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	createdById: string;
}

export interface DependencyRemovedEvent {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	removedById: string;
}

export interface TaskCommentAddedEvent {
	commentId: string;
	taskId: string;
	authorId: string | null;
	content: string;
}

export interface TaskCommentUpdatedEvent {
	commentId: string;
	taskId: string;
	content: string;
	updatedById: string;
}

export interface TaskCommentDeletedEvent {
	commentId: string;
	taskId: string;
	deletedById: string;
}

export interface ChildrenCompletedEvent {
	parentTaskId: string;
	completedChildIds: string[];
	triggeredById: string;
}

export interface DependencyBlockedEvent {
	blockedTaskId: string;
	blockingTaskId: string;
	dependencyType: string;
}

export const TASK_EVENTS = {
	CREATED: "task.created",
	UPDATED: "task.updated",
	STATUS_CHANGED: "task.statusChanged",
	ASSIGNED: "task.assigned",
	UNASSIGNED: "task.unassigned",
	MOVED: "task.moved",
	DELETED: "task.deleted",
	DEPENDENCY_ADDED: "task.dependencyAdded",
	DEPENDENCY_REMOVED: "task.dependencyRemoved",
	COMMENT_ADDED: "task.commentAdded",
	COMMENT_UPDATED: "task.commentUpdated",
	COMMENT_DELETED: "task.commentDeleted",
	CHILDREN_COMPLETED: "task.childrenCompleted",
	DEPENDENCY_BLOCKED: "task.dependencyBlocked",
} as const;
