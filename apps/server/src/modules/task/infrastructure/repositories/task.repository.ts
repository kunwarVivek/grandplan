// ============================================
// TASK REPOSITORY
// ============================================

import type {
	DependencyType,
	Prisma,
	TaskHistoryAction,
	TaskNodeType,
	TaskPriority,
	TaskStatus,
} from "@grandplan/db";
import db, { withTransaction } from "@grandplan/db";
import type {
	TaskCommentEntity,
	TaskDependencyEntity,
	TaskHistoryEntity,
	TaskNodeEntity,
	TaskNodeWithRelations,
} from "../../domain/entities/task-node.entity.js";
import { materializedPathUtils } from "../../domain/value-objects/materialized-path.vo.js";
import type {
	ITaskCommentRepository,
	ITaskDependencyRepository,
	ITaskHistoryRepository,
	ITaskRepository,
	TaskQueryOptions,
	TaskQueryResult,
} from "./interfaces/index.js";

// Re-export interfaces for backwards compatibility
export type { TaskQueryOptions, TaskQueryResult } from "./interfaces/index.js";

export class TaskRepository
	implements
		ITaskRepository,
		ITaskDependencyRepository,
		ITaskHistoryRepository,
		ITaskCommentRepository
{
	async create(data: {
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
	}): Promise<TaskNodeEntity> {
		const task = await db.taskNode.create({
			data: {
				title: data.title,
				description: data.description,
				projectId: data.projectId,
				parentId: data.parentId,
				nodeType: data.nodeType,
				status: data.status ?? "DRAFT",
				priority: data.priority ?? "MEDIUM",
				createdById: data.createdById,
				assigneeId: data.assigneeId,
				estimatedHours: data.estimatedHours,
				dueDate: data.dueDate,
				position: data.position ?? 0,
				depth: data.depth,
				path: data.path,
			},
		});

		return task;
	}

	/**
	 * Create a task with path calculation and history in a single transaction.
	 * This ensures atomicity: if any step fails, the entire operation is rolled back.
	 */
	async createWithPath(data: {
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
	}): Promise<TaskNodeEntity> {
		return withTransaction(async (tx) => {
			// Create task with temporary path
			const task = await tx.taskNode.create({
				data: {
					title: data.title,
					description: data.description,
					projectId: data.projectId,
					parentId: data.parentId,
					nodeType: data.nodeType,
					status: data.status ?? "DRAFT",
					priority: data.priority ?? "MEDIUM",
					createdById: data.createdById,
					assigneeId: data.assigneeId,
					estimatedHours: data.estimatedHours,
					dueDate: data.dueDate,
					position: data.position,
					depth: data.depth,
					path: "", // Temporary, will update
				},
			});

			// Calculate and update path
			const path = data.parentPath
				? materializedPathUtils.buildPath(data.parentPath, task.id)
				: task.id;

			const updatedTask = await tx.taskNode.update({
				where: { id: task.id },
				data: { path },
			});

			// Record creation history
			await tx.taskHistory.create({
				data: {
					taskId: task.id,
					action: "CREATED",
					actorId: data.createdById,
					aiTriggered: false,
				},
			});

			return updatedTask;
		});
	}

	async findById(id: string): Promise<TaskNodeEntity | null> {
		return db.taskNode.findUnique({
			where: { id },
		});
	}

	async findByIdWithRelations(
		id: string,
	): Promise<TaskNodeWithRelations | null> {
		return db.taskNode.findUnique({
			where: { id },
			include: {
				parent: true,
				children: {
					orderBy: { position: "asc" },
				},
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				assignee: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		}) as Promise<TaskNodeWithRelations | null>;
	}

	async findByProject(
		projectId: string,
		options: Omit<TaskQueryOptions, "projectId"> = {},
	): Promise<TaskQueryResult> {
		const {
			page = 1,
			limit = 50,
			parentId,
			status,
			priority,
			nodeType,
			assigneeId,
			createdById,
			search,
			includeCompleted = false,
			dueBefore,
			dueAfter,
			sortBy = "position",
			sortOrder = "asc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.TaskNodeWhereInput = {
			projectId,
			...(parentId !== undefined && { parentId }),
			...(status && { status }),
			...(priority && { priority }),
			...(nodeType && { nodeType }),
			...(assigneeId && { assigneeId }),
			...(createdById && { createdById }),
			...(!includeCompleted && {
				status: { notIn: ["COMPLETED", "CANCELLED"] },
			}),
			...(search && {
				OR: [
					{ title: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
			...(dueBefore && { dueDate: { lte: dueBefore } }),
			...(dueAfter && { dueDate: { gte: dueAfter } }),
		};

		const [tasks, total] = await Promise.all([
			db.taskNode.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.taskNode.count({ where }),
		]);

		return {
			tasks,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findChildren(parentId: string): Promise<TaskNodeEntity[]> {
		return db.taskNode.findMany({
			where: { parentId },
			orderBy: { position: "asc" },
		});
	}

	async findDescendants(ancestorPath: string): Promise<TaskNodeEntity[]> {
		return db.taskNode.findMany({
			where: {
				path: { startsWith: `${ancestorPath}.` },
			},
			orderBy: [{ depth: "asc" }, { position: "asc" }],
		});
	}

	async findAncestors(path: string): Promise<TaskNodeEntity[]> {
		const ancestorIds = materializedPathUtils.getAncestorIds(path);
		if (ancestorIds.length === 0) return [];

		return db.taskNode.findMany({
			where: {
				id: { in: ancestorIds },
			},
			orderBy: { depth: "asc" },
		});
	}

	async update(
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
	): Promise<TaskNodeEntity> {
		return db.taskNode.update({
			where: { id },
			data,
		});
	}

	async updateStatus(id: string, status: TaskStatus): Promise<TaskNodeEntity> {
		const now = new Date();
		const updateData: Prisma.TaskNodeUpdateInput = { status };

		if (status === "IN_PROGRESS") {
			updateData.startedAt = now;
		} else if (status === "COMPLETED") {
			updateData.completedAt = now;
		}

		return db.taskNode.update({
			where: { id },
			data: updateData,
		});
	}

	/**
	 * Update task status with history recording in a single transaction.
	 * This ensures atomicity for cascade operations.
	 */
	async updateStatusWithHistory(
		id: string,
		status: TaskStatus,
		history: {
			previousStatus: TaskStatus;
			reason?: string;
			actorId: string | null;
			aiTriggered?: boolean;
		},
	): Promise<TaskNodeEntity> {
		return withTransaction(async (tx) => {
			const now = new Date();
			const updateData: Prisma.TaskNodeUpdateInput = { status };

			if (status === "IN_PROGRESS") {
				updateData.startedAt = now;
			} else if (status === "COMPLETED") {
				updateData.completedAt = now;
			}

			const updatedTask = await tx.taskNode.update({
				where: { id },
				data: updateData,
			});

			await tx.taskHistory.create({
				data: {
					taskId: id,
					action: "STATUS_CHANGED",
					field: "status",
					oldValue: history.previousStatus as unknown as Prisma.InputJsonValue,
					newValue: status as unknown as Prisma.InputJsonValue,
					reason: history.reason,
					actorId: history.actorId,
					aiTriggered: history.aiTriggered ?? false,
				},
			});

			return updatedTask;
		});
	}

	async move(
		id: string,
		newParentId: string | null,
		newPosition: number,
	): Promise<{ task: TaskNodeEntity; descendants: TaskNodeEntity[] }> {
		return withTransaction(async (tx) => {
			const task = await tx.taskNode.findUnique({ where: { id } });
			if (!task) throw new Error("Task not found");

			// Calculate new path and depth
			let newPath: string;
			let newDepth: number;

			if (newParentId) {
				const parent = await tx.taskNode.findUnique({
					where: { id: newParentId },
				});
				if (!parent) throw new Error("Parent task not found");
				newPath = materializedPathUtils.buildPath(parent.path, id);
				newDepth = parent.depth + 1;
			} else {
				newPath = id;
				newDepth = 0;
			}

			// Update the task
			const updatedTask = await tx.taskNode.update({
				where: { id },
				data: {
					parentId: newParentId,
					position: newPosition,
					path: newPath,
					depth: newDepth,
				},
			});

			// Update all descendants' paths within the transaction
			const descendants = await tx.taskNode.findMany({
				where: {
					path: { startsWith: `${task.path}.` },
				},
				orderBy: [{ depth: "asc" }, { position: "asc" }],
			});
			const updatedDescendants: TaskNodeEntity[] = [];

			for (const descendant of descendants) {
				const newDescendantPath = descendant.path.replace(task.path, newPath);
				const newDescendantDepth =
					materializedPathUtils.getDepth(newDescendantPath);

				const updated = await tx.taskNode.update({
					where: { id: descendant.id },
					data: {
						path: newDescendantPath,
						depth: newDescendantDepth,
					},
				});
				updatedDescendants.push(updated);
			}

			return { task: updatedTask, descendants: updatedDescendants };
		});
	}

	async delete(id: string): Promise<void> {
		await db.taskNode.delete({
			where: { id },
		});
	}

	async deleteWithDescendants(id: string): Promise<number> {
		const task = await db.taskNode.findUnique({ where: { id } });
		if (!task) return 0;

		// Delete descendants first (they will be cascade deleted anyway, but this is explicit)
		const result = await db.taskNode.deleteMany({
			where: {
				OR: [{ id }, { path: { startsWith: `${task.path}.` } }],
			},
		});

		return result.count;
	}

	async getNextPosition(
		projectId: string,
		parentId: string | null,
	): Promise<number> {
		const lastTask = await db.taskNode.findFirst({
			where: { projectId, parentId },
			orderBy: { position: "desc" },
			select: { position: true },
		});
		return (lastTask?.position ?? -1) + 1;
	}

	// Dependencies
	async addDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
		createdById: string,
	): Promise<TaskDependencyEntity> {
		return db.taskDependency.create({
			data: {
				fromTaskId,
				toTaskId,
				type,
				createdById,
			},
		});
	}

	async removeDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
	): Promise<void> {
		await db.taskDependency.deleteMany({
			where: { fromTaskId, toTaskId, type },
		});
	}

	async findDependency(
		fromTaskId: string,
		toTaskId: string,
		type: DependencyType,
	): Promise<TaskDependencyEntity | null> {
		return db.taskDependency.findFirst({
			where: { fromTaskId, toTaskId, type },
		});
	}

	async getDependencies(taskId: string): Promise<{
		blocking: TaskDependencyEntity[];
		blockedBy: TaskDependencyEntity[];
		related: TaskDependencyEntity[];
	}> {
		const [blocking, blockedBy, related] = await Promise.all([
			db.taskDependency.findMany({
				where: { fromTaskId: taskId, type: "BLOCKS" },
				include: {
					toTask: {
						select: { id: true, title: true, status: true },
					},
				},
			}),
			db.taskDependency.findMany({
				where: { toTaskId: taskId, type: "BLOCKS" },
				include: {
					fromTask: {
						select: { id: true, title: true, status: true },
					},
				},
			}),
			db.taskDependency.findMany({
				where: {
					OR: [
						{ fromTaskId: taskId, type: "RELATED_TO" },
						{ toTaskId: taskId, type: "RELATED_TO" },
					],
				},
				include: {
					fromTask: {
						select: { id: true, title: true, status: true },
					},
					toTask: {
						select: { id: true, title: true, status: true },
					},
				},
			}),
		]);

		return { blocking, blockedBy, related };
	}

	async getBlockingTasks(taskId: string): Promise<TaskNodeEntity[]> {
		const dependencies = await db.taskDependency.findMany({
			where: { toTaskId: taskId, type: "BLOCKS" },
			include: { fromTask: true },
		});
		return dependencies.map((d) => d.fromTask);
	}

	// History
	async addHistory(data: {
		taskId: string;
		action: TaskHistoryAction;
		field?: string | null;
		oldValue?: unknown;
		newValue?: unknown;
		reason?: string | null;
		actorId?: string | null;
		aiTriggered?: boolean;
	}): Promise<TaskHistoryEntity> {
		return db.taskHistory.create({
			data: {
				taskId: data.taskId,
				action: data.action,
				field: data.field,
				oldValue: data.oldValue as Prisma.InputJsonValue,
				newValue: data.newValue as Prisma.InputJsonValue,
				reason: data.reason,
				actorId: data.actorId,
				aiTriggered: data.aiTriggered ?? false,
			},
		});
	}

	async getHistory(
		taskId: string,
		options: { page?: number; limit?: number; action?: string } = {},
	): Promise<{ history: TaskHistoryEntity[]; total: number }> {
		const { page = 1, limit = 20, action } = options;
		const skip = (page - 1) * limit;

		const where: Prisma.TaskHistoryWhereInput = {
			taskId,
			...(action && { action: action as TaskHistoryAction }),
		};

		const [history, total] = await Promise.all([
			db.taskHistory.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					actor: {
						select: { id: true, name: true, email: true },
					},
				},
			}),
			db.taskHistory.count({ where }),
		]);

		return { history, total };
	}

	// Comments
	async addComment(data: {
		taskId: string;
		content: string;
		authorId?: string | null;
		parentId?: string | null;
		aiGenerated?: boolean;
	}): Promise<TaskCommentEntity> {
		return db.taskComment.create({
			data: {
				taskId: data.taskId,
				content: data.content,
				authorId: data.authorId,
				parentId: data.parentId,
				aiGenerated: data.aiGenerated ?? false,
			},
		});
	}

	async updateComment(id: string, content: string): Promise<TaskCommentEntity> {
		return db.taskComment.update({
			where: { id },
			data: { content },
		});
	}

	async deleteComment(id: string): Promise<void> {
		await db.taskComment.delete({
			where: { id },
		});
	}

	async getComment(id: string): Promise<TaskCommentEntity | null> {
		return db.taskComment.findUnique({
			where: { id },
		});
	}

	async getComments(taskId: string): Promise<TaskCommentEntity[]> {
		return db.taskComment.findMany({
			where: { taskId },
			orderBy: { createdAt: "asc" },
			include: {
				author: {
					select: { id: true, name: true, email: true, image: true },
				},
				replies: {
					include: {
						author: {
							select: { id: true, name: true, email: true, image: true },
						},
					},
					orderBy: { createdAt: "asc" },
				},
			},
		});
	}

	// Bulk operations
	async bulkUpdateStatus(
		taskIds: string[],
		status: TaskStatus,
	): Promise<number> {
		const now = new Date();
		const updateData: Prisma.TaskNodeUpdateManyMutationInput = { status };

		if (status === "IN_PROGRESS") {
			updateData.startedAt = now;
		} else if (status === "COMPLETED") {
			updateData.completedAt = now;
		}

		const result = await db.taskNode.updateMany({
			where: { id: { in: taskIds } },
			data: updateData,
		});

		return result.count;
	}

	async bulkDelete(taskIds: string[]): Promise<number> {
		const result = await db.taskNode.deleteMany({
			where: { id: { in: taskIds } },
		});
		return result.count;
	}

	async bulkArchive(taskIds: string[]): Promise<number> {
		const result = await db.taskNode.updateMany({
			where: { id: { in: taskIds } },
			data: { status: "ARCHIVED" as TaskStatus },
		});
		return result.count;
	}

	async countChildrenByStatus(
		parentId: string,
	): Promise<Record<TaskStatus, number>> {
		const counts = await db.taskNode.groupBy({
			by: ["status"],
			where: { parentId },
			_count: true,
		});

		const result: Record<string, number> = {
			DRAFT: 0,
			PENDING: 0,
			IN_PROGRESS: 0,
			BLOCKED: 0,
			IN_REVIEW: 0,
			COMPLETED: 0,
			CANCELLED: 0,
		};

		for (const count of counts) {
			result[count.status] = count._count;
		}

		return result as Record<TaskStatus, number>;
	}
}

export const taskRepository = new TaskRepository();
