// ============================================
// TASK NODE ENTITY
// ============================================

import type {
	DependencyType,
	TaskNodeType,
	TaskPriority,
	TaskStatus,
} from "@prisma/client";

export interface TaskNodeEntity {
	id: string;
	title: string;
	description: string | null;
	nodeType: TaskNodeType;
	status: TaskStatus;
	priority: TaskPriority;
	position: number;

	// AI-related
	aiGenerated: boolean;
	aiConfidence: number | null;

	// Temporal tracking
	estimatedHours: number | null;
	actualHours: number | null;
	dueDate: Date | null;
	startedAt: Date | null;
	completedAt: Date | null;

	// Hierarchy
	projectId: string;
	parentId: string | null;
	depth: number;
	path: string;

	// Ownership
	createdById: string;
	assigneeId: string | null;

	createdAt: Date;
	updatedAt: Date;
}

export interface TaskNodeWithRelations extends TaskNodeEntity {
	parent: TaskNodeEntity | null;
	children: TaskNodeEntity[];
	createdBy: {
		id: string;
		name: string | null;
		email: string;
	};
	assignee: {
		id: string;
		name: string | null;
		email: string;
	} | null;
}

export interface TaskDependencyEntity {
	id: string;
	type: DependencyType;
	fromTaskId: string;
	toTaskId: string;
	createdById: string | null;
	createdAt: Date;
}

export interface TaskHistoryEntity {
	id: string;
	action: string;
	field: string | null;
	oldValue: unknown;
	newValue: unknown;
	reason: string | null;
	taskId: string;
	actorId: string | null;
	aiTriggered: boolean;
	createdAt: Date;
}

export interface TaskCommentEntity {
	id: string;
	content: string;
	aiGenerated: boolean;
	taskId: string;
	authorId: string | null;
	parentId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export const TASK_NODE_TYPES = [
	"EPIC",
	"STORY",
	"TASK",
	"SUBTASK",
	"BUG",
	"SPIKE",
] as const;
export const TASK_STATUSES = [
	"DRAFT",
	"PENDING",
	"IN_PROGRESS",
	"BLOCKED",
	"IN_REVIEW",
	"COMPLETED",
	"CANCELLED",
] as const;
export const TASK_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const DEPENDENCY_TYPES = [
	"BLOCKS",
	"REQUIRED_BY",
	"RELATED_TO",
] as const;

export const COMPLETED_STATUSES: TaskStatus[] = ["COMPLETED", "CANCELLED"];
export const BLOCKING_STATUSES: TaskStatus[] = [
	"DRAFT",
	"PENDING",
	"IN_PROGRESS",
	"BLOCKED",
	"IN_REVIEW",
];

export function isTaskCompleted(status: TaskStatus): boolean {
	return COMPLETED_STATUSES.includes(status);
}

export function isTaskBlocking(status: TaskStatus): boolean {
	return BLOCKING_STATUSES.includes(status);
}

export function canTransitionTo(
	currentStatus: TaskStatus,
	newStatus: TaskStatus,
): boolean {
	// Define valid status transitions
	const validTransitions: Record<TaskStatus, TaskStatus[]> = {
		DRAFT: ["PENDING", "CANCELLED"],
		PENDING: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
		IN_PROGRESS: ["PENDING", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"],
		BLOCKED: ["PENDING", "IN_PROGRESS", "CANCELLED"],
		IN_REVIEW: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
		COMPLETED: ["IN_PROGRESS"], // Can reopen
		CANCELLED: ["DRAFT", "PENDING"], // Can restore
	};

	return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

export function getDefaultNodeTypeForDepth(depth: number): TaskNodeType {
	if (depth === 0) return "EPIC";
	if (depth === 1) return "STORY";
	if (depth === 2) return "TASK";
	return "SUBTASK";
}

export function calculateProgress(
	tasks: Array<{ status: TaskStatus }>,
): number {
	if (tasks.length === 0) return 0;
	const completed = tasks.filter((t) => isTaskCompleted(t.status)).length;
	return Math.round((completed / tasks.length) * 100);
}
