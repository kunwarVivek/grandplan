export type TaskStatus =
	| "backlog"
	| "todo"
	| "in_progress"
	| "in_review"
	| "blocked"
	| "completed"
	| "cancelled";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type Task = {
	id: string;
	title: string;
	description?: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	projectId: string;
	parentId?: string | null;
	assigneeId?: string | null;
	assignee?: { id: string; name: string; avatar?: string | null } | null;
	dueDate?: Date | null;
	startDate?: Date | null;
	estimatedHours?: number | null;
	actualHours?: number | null;
	tags?: string[];
	dependencies?: string[];
	progress: number;
	position: number;
	depth: number;
	childCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type TaskColumn = {
	id: TaskStatus;
	title: string;
	tasks: Task[];
};

export type CreateTaskInput = {
	title: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	projectId: string;
	parentId?: string;
	assigneeId?: string;
	dueDate?: Date;
	startDate?: Date;
	estimatedHours?: number;
	tags?: string[];
};

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "projectId">> & {
	actualHours?: number;
	position?: number;
};

export type MoveTaskInput = {
	taskId: string;
	targetStatus?: TaskStatus;
	targetPosition?: number;
	targetParentId?: string | null;
};

export type TaskFilters = {
	status?: TaskStatus[];
	priority?: TaskPriority[];
	assigneeId?: string[];
	search?: string;
	dueDateFrom?: Date;
	dueDateTo?: Date;
	createdAfter?: Date;
	createdBefore?: Date;
};

export const TASK_STATUS_CONFIG: Record<
	TaskStatus,
	{ label: string; color: string; bgColor: string }
> = {
	backlog: {
		label: "Backlog",
		color: "text-muted-foreground",
		bgColor: "bg-muted",
	},
	todo: { label: "To Do", color: "text-blue-500", bgColor: "bg-blue-500/10" },
	in_progress: {
		label: "In Progress",
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
	},
	in_review: {
		label: "In Review",
		color: "text-purple-500",
		bgColor: "bg-purple-500/10",
	},
	blocked: {
		label: "Blocked",
		color: "text-red-500",
		bgColor: "bg-red-500/10",
	},
	completed: {
		label: "Completed",
		color: "text-emerald-500",
		bgColor: "bg-emerald-500/10",
	},
	cancelled: {
		label: "Cancelled",
		color: "text-muted-foreground",
		bgColor: "bg-muted",
	},
};

export const TASK_PRIORITY_CONFIG: Record<
	TaskPriority,
	{ label: string; color: string; icon: string }
> = {
	urgent: { label: "Urgent", color: "text-red-500", icon: "!!!" },
	high: { label: "High", color: "text-orange-500", icon: "!!" },
	medium: { label: "Medium", color: "text-amber-500", icon: "!" },
	low: { label: "Low", color: "text-blue-500", icon: "-" },
};

// Comment types
export type TaskCommentAuthor = {
	id: string;
	name: string | null;
	email: string;
	image?: string | null;
};

export type TaskComment = {
	id: string;
	content: string;
	aiGenerated: boolean;
	taskId: string;
	authorId: string | null;
	parentId: string | null;
	createdAt: Date;
	updatedAt: Date;
	author: TaskCommentAuthor | null;
	replies?: TaskComment[];
};

export type CreateCommentInput = {
	content: string;
	parentId?: string | null;
};

export type UpdateCommentInput = {
	content: string;
};

// History types
export type TaskHistoryAction =
	| "CREATED"
	| "UPDATED"
	| "STATUS_CHANGED"
	| "ASSIGNED"
	| "UNASSIGNED"
	| "MOVED"
	| "DEPENDENCY_ADDED"
	| "DEPENDENCY_REMOVED"
	| "COMMENTED";

export type TaskHistoryActor = {
	id: string;
	name: string | null;
	email: string;
};

export type TaskHistory = {
	id: string;
	action: TaskHistoryAction;
	field: string | null;
	oldValue: unknown;
	newValue: unknown;
	reason: string | null;
	taskId: string;
	actorId: string | null;
	aiTriggered: boolean;
	createdAt: Date;
	actor: TaskHistoryActor | null;
};

// Activity item combining comments and history
export type ActivityItem =
	| { type: "comment"; data: TaskComment; timestamp: Date }
	| { type: "history"; data: TaskHistory; timestamp: Date };
