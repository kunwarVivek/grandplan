// ============================================
// TASK REPOSITORY INTERFACE
// ============================================

import type {
	DependencyType,
	TaskHistoryAction,
	TaskNodeType,
	TaskPriority,
	TaskStatus,
} from "@grandplan/db";
import type {
	TaskCommentEntity,
	TaskDependencyEntity,
	TaskHistoryEntity,
	TaskNodeEntity,
	TaskNodeWithRelations,
} from "../../../domain/entities/task-node.entity.js";

// ============================================
// Query Options
// ============================================

export interface TaskQueryOptions {
	page?: number;
	limit?: number;
	projectId?: string;
	parentId?: string | null;
	status?: TaskStatus;
	priority?: TaskPriority;
	nodeType?: TaskNodeType;
	assigneeId?: string;
	createdById?: string;
	search?: string;
	includeCompleted?: boolean;
	dueBefore?: Date;
	dueAfter?: Date;
	sortBy?:
		| "title"
		| "createdAt"
		| "updatedAt"
		| "dueDate"
		| "priority"
		| "position";
	sortOrder?: "asc" | "desc";
}

export interface TaskQueryResult {
	tasks: TaskNodeEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ============================================
// Task Repository Interface
// ============================================

export interface ITaskRepository {
	// Task CRUD
	create(data: {
		title: string;
		description?: string | null;
		projectId: string;
		parentId?: string | null;
		nodeType: TaskNodeType;
		status?: TaskStatus;
		priority?: TaskPriority;
		createdById: string;
		assigneeId?: string | null;
		estimatedHours?: number | null;
		dueDate?: Date | null;
		position?: number;
		depth: number;
		path: string;
	}): Promise<TaskNodeEntity>;

	createWithPath(data: {
		title: string;
		description?: string | null;
		projectId: string;
		parentId?: string | null;
		parentPath?: string | null;
		nodeType: TaskNodeType;
		status?: TaskStatus;
		priority?: TaskPriority;
		createdById: string;
		assigneeId?: string | null;
		estimatedHours?: number | null;
		dueDate?: Date | null;
		position: number;
		depth: number;
	}): Promise<TaskNodeEntity>;

	findById(id: string): Promise<TaskNodeEntity | null>;

	findByIdWithRelations(id: string): Promise<TaskNodeWithRelations | null>;

	findByProject(
		projectId: string,
		options?: Omit<TaskQueryOptions, "projectId">,
	): Promise<TaskQueryResult>;

	findChildren(parentId: string): Promise<TaskNodeEntity[]>;

	findDescendants(ancestorPath: string): Promise<TaskNodeEntity[]>;

	findAncestors(path: string): Promise<TaskNodeEntity[]>;

	update(
		id: string,
		data: Partial<
			Pick<
				TaskNodeEntity,
				| "title"
				| "description"
				| "nodeType"
				| "status"
				| "priority"
				| "assigneeId"
				| "estimatedHours"
				| "actualHours"
				| "dueDate"
				| "position"
				| "startedAt"
				| "completedAt"
			>
		>,
	): Promise<TaskNodeEntity>;

	updateStatus(id: string, status: TaskStatus): Promise<TaskNodeEntity>;

	updateStatusWithHistory(
		id: string,
		status: TaskStatus,
		history: {
			previousStatus: TaskStatus;
			reason?: string;
			actorId: string | null;
			aiTriggered?: boolean;
		},
	): Promise<TaskNodeEntity>;

	move(
		id: string,
		newParentId: string | null,
		newPosition: number,
	): Promise<{ task: TaskNodeEntity; descendants: TaskNodeEntity[] }>;

	delete(id: string): Promise<void>;

	deleteWithDescendants(id: string): Promise<number>;

	getNextPosition(projectId: string, parentId: string | null): Promise<number>;

	// Bulk operations
	bulkUpdateStatus(taskIds: string[], status: TaskStatus): Promise<number>;

	countChildrenByStatus(parentId: string): Promise<Record<TaskStatus, number>>;
}

// ============================================
// Task Dependency Repository Interface
// ============================================

export interface ITaskDependencyRepository {
	addDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
		createdById: string,
	): Promise<TaskDependencyEntity>;

	removeDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
	): Promise<void>;

	findDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
	): Promise<TaskDependencyEntity | null>;

	getDependencies(taskId: string): Promise<{
		blocking: TaskDependencyEntity[];
		blockedBy: TaskDependencyEntity[];
		related: TaskDependencyEntity[];
	}>;

	getBlockingTasks(taskId: string): Promise<TaskNodeEntity[]>;
}

// ============================================
// Task History Repository Interface
// ============================================

export interface ITaskHistoryRepository {
	addHistory(data: {
		taskId: string;
		action: TaskHistoryAction;
		field?: string | null;
		oldValue?: unknown;
		newValue?: unknown;
		reason?: string | null;
		actorId?: string | null;
		aiTriggered?: boolean;
	}): Promise<TaskHistoryEntity>;

	getHistory(
		taskId: string,
		options?: { page?: number; limit?: number; action?: string },
	): Promise<{ history: TaskHistoryEntity[]; total: number }>;
}

// ============================================
// Task Comment Repository Interface
// ============================================

export interface ITaskCommentRepository {
	addComment(data: {
		taskId: string;
		content: string;
		authorId?: string | null;
		parentId?: string | null;
		aiGenerated?: boolean;
	}): Promise<TaskCommentEntity>;

	updateComment(id: string, content: string): Promise<TaskCommentEntity>;

	deleteComment(id: string): Promise<void>;

	getComment(id: string): Promise<TaskCommentEntity | null>;

	getComments(taskId: string): Promise<TaskCommentEntity[]>;
}
