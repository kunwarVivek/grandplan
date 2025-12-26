// ============================================
// TASK SERVICE
// ============================================

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@grandplan/core/errors";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import type {
	DependencyType,
	TaskNodeType,
	TaskPriority,
	TaskStatus,
} from "@prisma/client";
import { projectRepository } from "../../../project/infrastructure/repositories/project.repository.js";
import { workspaceRepository } from "../../../workspace/infrastructure/repositories/workspace.repository.js";
import type {
	AddDependencyDto,
	CreateCommentDto,
	CreateTaskDto,
	UpdateCommentDto,
} from "../../api/dto/create-task.dto.js";
import type {
	BulkStatusUpdateDto,
	MoveTaskDto,
	UpdateTaskDto,
} from "../../api/dto/update-task.dto.js";
import {
	canTransitionTo,
	getDefaultNodeTypeForDepth,
	isTaskCompleted,
} from "../../domain/entities/task-node.entity.js";
import { TASK_EVENTS } from "../../domain/events/task.events.js";
import { materializedPathUtils } from "../../domain/value-objects/materialized-path.vo.js";
import {
	type TaskQueryOptions,
	taskRepository,
} from "../../infrastructure/repositories/task.repository.js";
import { taskCascadeService } from "./task-cascade.service.js";

export class TaskService {
	private async verifyProjectAccess(projectId: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(projectId);

		if (!project) {
			throw new NotFoundError("Project", projectId);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		const isMember = await workspaceRepository.isMember(
			project.workspaceId,
			tenant.userId,
		);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		return { project, tenant };
	}

	async create(dto: CreateTaskDto) {
		const { project, tenant } = await this.verifyProjectAccess(dto.projectId);

		// Calculate path and depth
		let depth = 0;
		let path: string;
		let position = dto.position;

		if (dto.parentId) {
			const parent = await taskRepository.findById(dto.parentId);
			if (!parent) {
				throw new NotFoundError("Parent task", dto.parentId);
			}
			if (parent.projectId !== dto.projectId) {
				throw new ValidationError(
					"Parent task must be in the same project",
					{},
				);
			}
			depth = parent.depth + 1;
		}

		// Get next position if not specified
		if (position === undefined) {
			position = await taskRepository.getNextPosition(
				dto.projectId,
				dto.parentId ?? null,
			);
		}

		// Determine node type based on depth if not specified
		const nodeType = dto.nodeType ?? getDefaultNodeTypeForDepth(depth);

		// Create task first to get ID, then build path
		const task = await taskRepository.create({
			title: dto.title,
			description: dto.description,
			projectId: dto.projectId,
			parentId: dto.parentId,
			nodeType: nodeType as TaskNodeType,
			status: (dto.status ?? "DRAFT") as TaskStatus,
			priority: (dto.priority ?? "MEDIUM") as TaskPriority,
			createdById: tenant.userId,
			assigneeId: dto.assigneeId,
			estimatedHours: dto.estimatedHours,
			dueDate: dto.dueDate,
			position,
			depth,
			path: "", // Temporary, will update
		});

		// Now update with correct path
		if (dto.parentId) {
			const parent = await taskRepository.findById(dto.parentId);
			path = materializedPathUtils.buildPath(parent!.path, task.id);
		} else {
			path = task.id;
		}

		const updatedTask = await taskRepository.update(task.id, { path } as never);
		// @ts-expect-error - workaround for type issue
		updatedTask.path = path;

		// Record history
		await taskRepository.addHistory({
			taskId: task.id,
			action: "CREATED",
			actorId: tenant.userId,
		});

		// Emit events
		await eventBus.emit(TASK_EVENTS.CREATED, {
			taskId: task.id,
			title: task.title,
			nodeType: task.nodeType,
			projectId: task.projectId,
			parentId: task.parentId,
			createdById: tenant.userId,
			createdAt: task.createdAt,
		});

		await auditService.log({
			action: "task.created",
			resourceType: "task",
			resourceId: task.id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { title: task.title, projectId: dto.projectId },
		});

		return updatedTask;
	}

	async findById(id: string) {
		const task = await taskRepository.findByIdWithRelations(id);
		if (!task) {
			throw new NotFoundError("Task", id);
		}

		await this.verifyProjectAccess(task.projectId);
		return task;
	}

	async list(options: TaskQueryOptions = {}) {
		const tenant = getCurrentTenant();

		if (options.projectId) {
			await this.verifyProjectAccess(options.projectId);
			return taskRepository.findByProject(options.projectId, options);
		}

		throw new ValidationError("Project ID is required", {
			projectId: ["Required"],
		});
	}

	async update(id: string, dto: UpdateTaskDto) {
		const task = await taskRepository.findById(id);
		if (!task) {
			throw new NotFoundError("Task", id);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		// Track changes
		const trackableFields = [
			"title",
			"description",
			"nodeType",
			"priority",
			"assigneeId",
			"estimatedHours",
			"actualHours",
			"dueDate",
			"position",
		] as const;
		for (const field of trackableFields) {
			if (dto[field] !== undefined && dto[field] !== task[field]) {
				previousValues[field] = task[field];
				changes[field] = dto[field];
			}
		}

		// Handle status change separately for cascade logic
		let statusChanged = false;
		let previousStatus: TaskStatus | undefined;
		if (dto.status && dto.status !== task.status) {
			if (!canTransitionTo(task.status, dto.status as TaskStatus)) {
				throw new ValidationError("Invalid status transition", {
					status: [`Cannot transition from ${task.status} to ${dto.status}`],
				});
			}
			previousStatus = task.status;
			statusChanged = true;
			previousValues.status = task.status;
			changes.status = dto.status;
		}

		const updated = await taskRepository.update(id, dto as never);

		// Record history for each change
		if (Object.keys(changes).length > 0) {
			for (const [field, newValue] of Object.entries(changes)) {
				if (field === "status") {
					await taskRepository.addHistory({
						taskId: id,
						action: "STATUS_CHANGED",
						field,
						oldValue: previousValues[field],
						newValue,
						actorId: tenant.userId,
					});
				} else if (field === "assigneeId") {
					await taskRepository.addHistory({
						taskId: id,
						action: previousValues[field] ? "ASSIGNED" : "UNASSIGNED",
						field,
						oldValue: previousValues[field],
						newValue,
						actorId: tenant.userId,
					});
				} else {
					await taskRepository.addHistory({
						taskId: id,
						action: "UPDATED",
						field,
						oldValue: previousValues[field],
						newValue,
						actorId: tenant.userId,
					});
				}
			}

			await eventBus.emit(TASK_EVENTS.UPDATED, {
				taskId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			// Handle status change cascade
			if (statusChanged && dto.status === "COMPLETED") {
				await taskCascadeService.onTaskCompleted(id, tenant.userId);
			} else if (
				statusChanged &&
				previousStatus &&
				isTaskCompleted(previousStatus) &&
				!isTaskCompleted(dto.status as TaskStatus)
			) {
				// Task was reopened - handle parent cascade
				if (task.parentId) {
					await taskCascadeService.onChildReopened(
						task.parentId,
						id,
						tenant.userId,
					);
				}
			}

			// Emit specific events
			if (statusChanged) {
				await eventBus.emit(TASK_EVENTS.STATUS_CHANGED, {
					taskId: id,
					previousStatus: previousStatus!,
					newStatus: dto.status!,
					changedById: tenant.userId,
					aiTriggered: false,
				});
			}

			if (changes.assigneeId !== undefined) {
				if (changes.assigneeId) {
					await eventBus.emit(TASK_EVENTS.ASSIGNED, {
						taskId: id,
						assigneeId: changes.assigneeId as string,
						previousAssigneeId: previousValues.assigneeId as string | null,
						assignedById: tenant.userId,
					});
				} else {
					await eventBus.emit(TASK_EVENTS.UNASSIGNED, {
						taskId: id,
						previousAssigneeId: previousValues.assigneeId as string,
						unassignedById: tenant.userId,
					});
				}
			}

			await auditService.log({
				action: "task.updated",
				resourceType: "task",
				resourceId: id,
				userId: tenant.userId,
				organizationId: tenant.organizationId,
				metadata: { changes, previousValues },
			});
		}

		return updated;
	}

	async move(id: string, dto: MoveTaskDto) {
		const task = await taskRepository.findById(id);
		if (!task) {
			throw new NotFoundError("Task", id);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		// Validate new parent if specified
		if (dto.parentId) {
			const newParent = await taskRepository.findById(dto.parentId);
			if (!newParent) {
				throw new NotFoundError("Parent task", dto.parentId);
			}
			if (newParent.projectId !== task.projectId) {
				throw new ValidationError(
					"Cannot move task to a different project",
					{},
				);
			}
			// Check for circular reference
			if (newParent.path.startsWith(task.path)) {
				throw new ValidationError("Cannot move task to its own descendant", {});
			}
		}

		const previousPath = task.path;
		const previousParentId = task.parentId;
		const position =
			dto.position ??
			(await taskRepository.getNextPosition(
				task.projectId,
				dto.parentId ?? null,
			));

		const { task: movedTask, descendants } = await taskRepository.move(
			id,
			dto.parentId ?? null,
			position,
		);

		// Record history
		await taskRepository.addHistory({
			taskId: id,
			action: "MOVED",
			oldValue: { parentId: previousParentId, path: previousPath },
			newValue: { parentId: dto.parentId, path: movedTask.path },
			actorId: tenant.userId,
		});

		// Validate hierarchy after move
		await taskCascadeService.validateHierarchyAfterMove(id);

		await eventBus.emit(TASK_EVENTS.MOVED, {
			taskId: id,
			previousParentId,
			newParentId: dto.parentId ?? null,
			previousPath,
			newPath: movedTask.path,
			movedById: tenant.userId,
		});

		await auditService.log({
			action: "task.updated",
			resourceType: "task",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { action: "move", previousParentId, newParentId: dto.parentId },
		});

		return { task: movedTask, descendantsUpdated: descendants.length };
	}

	async delete(id: string) {
		const task = await taskRepository.findById(id);
		if (!task) {
			throw new NotFoundError("Task", id);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const deletedCount = await taskRepository.deleteWithDescendants(id);

		await eventBus.emit(TASK_EVENTS.DELETED, {
			taskId: id,
			title: task.title,
			projectId: task.projectId,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "task.deleted",
			resourceType: "task",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { title: task.title, deletedCount },
		});

		return { deletedCount };
	}

	async bulkUpdateStatus(dto: BulkStatusUpdateDto) {
		const tenant = getCurrentTenant();

		// Verify all tasks exist and are accessible
		for (const taskId of dto.taskIds) {
			const task = await taskRepository.findById(taskId);
			if (!task) {
				throw new NotFoundError("Task", taskId);
			}
			await this.verifyProjectAccess(task.projectId);
		}

		const count = await taskRepository.bulkUpdateStatus(
			dto.taskIds,
			dto.status as TaskStatus,
		);

		// Record history for each task
		for (const taskId of dto.taskIds) {
			await taskRepository.addHistory({
				taskId,
				action: "STATUS_CHANGED",
				field: "status",
				newValue: dto.status,
				actorId: tenant.userId,
			});
		}

		// Handle cascade for completed tasks
		if (dto.status === "COMPLETED") {
			for (const taskId of dto.taskIds) {
				await taskCascadeService.onTaskCompleted(taskId, tenant.userId);
			}
		}

		return { updated: count };
	}

	// Dependencies
	async addDependency(taskId: string, dto: AddDependencyDto) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const toTask = await taskRepository.findById(dto.toTaskId);
		if (!toTask) {
			throw new NotFoundError("Task", dto.toTaskId);
		}

		// Check same project
		if (task.projectId !== toTask.projectId) {
			throw new ValidationError(
				"Dependencies must be within the same project",
				{},
			);
		}

		// Check for existing dependency
		const existing = await taskRepository.findDependency(
			taskId,
			dto.toTaskId,
			dto.type as DependencyType,
		);
		if (existing) {
			throw new ConflictError("Dependency already exists");
		}

		// Check for circular dependency
		if (dto.type !== "RELATED_TO") {
			const wouldCycle = await taskCascadeService.wouldCreateCycle(
				taskId,
				dto.toTaskId,
			);
			if (wouldCycle) {
				throw new ValidationError(
					"This dependency would create a circular reference",
					{},
				);
			}
		}

		const dependency = await taskRepository.addDependency(
			taskId,
			dto.toTaskId,
			dto.type as DependencyType,
			tenant.userId,
		);

		// Record history
		await taskRepository.addHistory({
			taskId,
			action: "DEPENDENCY_ADDED",
			newValue: { toTaskId: dto.toTaskId, type: dto.type },
			actorId: tenant.userId,
		});

		// Handle blocking cascade
		if (dto.type === "BLOCKS") {
			await taskCascadeService.onDependencyAdded(
				taskId,
				dto.toTaskId,
				tenant.userId,
			);
		}

		await eventBus.emit(TASK_EVENTS.DEPENDENCY_ADDED, {
			dependencyId: dependency.id,
			fromTaskId: taskId,
			toTaskId: dto.toTaskId,
			type: dto.type,
			createdById: tenant.userId,
		});

		return dependency;
	}

	async removeDependency(taskId: string, toTaskId: string, type: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const dependency = await taskRepository.findDependency(
			taskId,
			toTaskId,
			type as DependencyType,
		);
		if (!dependency) {
			throw new NotFoundError("Dependency");
		}

		await taskRepository.removeDependency(
			taskId,
			toTaskId,
			type as DependencyType,
		);

		// Record history
		await taskRepository.addHistory({
			taskId,
			action: "DEPENDENCY_REMOVED",
			oldValue: { toTaskId, type },
			actorId: tenant.userId,
		});

		await eventBus.emit(TASK_EVENTS.DEPENDENCY_REMOVED, {
			dependencyId: dependency.id,
			fromTaskId: taskId,
			toTaskId,
			type,
			removedById: tenant.userId,
		});
	}

	async getDependencies(taskId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.getDependencies(taskId);
	}

	// History
	async getHistory(
		taskId: string,
		options: { page?: number; limit?: number; action?: string } = {},
	) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.getHistory(taskId, options);
	}

	// Comments
	async addComment(taskId: string, dto: CreateCommentDto) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const comment = await taskRepository.addComment({
			taskId,
			content: dto.content,
			authorId: tenant.userId,
			parentId: dto.parentId,
		});

		await eventBus.emit(TASK_EVENTS.COMMENT_ADDED, {
			commentId: comment.id,
			taskId,
			authorId: tenant.userId,
			content: dto.content,
		});

		return comment;
	}

	async updateComment(
		taskId: string,
		commentId: string,
		dto: UpdateCommentDto,
	) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const comment = await taskRepository.getComment(commentId);
		if (!comment || comment.taskId !== taskId) {
			throw new NotFoundError("Comment", commentId);
		}

		// Only author can edit their comments
		if (comment.authorId !== tenant.userId && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You can only edit your own comments");
		}

		const updated = await taskRepository.updateComment(commentId, dto.content);

		await eventBus.emit(TASK_EVENTS.COMMENT_UPDATED, {
			commentId,
			taskId,
			content: dto.content,
			updatedById: tenant.userId,
		});

		return updated;
	}

	async deleteComment(taskId: string, commentId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		const { tenant } = await this.verifyProjectAccess(task.projectId);

		const comment = await taskRepository.getComment(commentId);
		if (!comment || comment.taskId !== taskId) {
			throw new NotFoundError("Comment", commentId);
		}

		// Only author can delete their comments (or admin)
		if (comment.authorId !== tenant.userId && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You can only delete your own comments");
		}

		await taskRepository.deleteComment(commentId);

		await eventBus.emit(TASK_EVENTS.COMMENT_DELETED, {
			commentId,
			taskId,
			deletedById: tenant.userId,
		});
	}

	async getComments(taskId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.getComments(taskId);
	}

	// Tree operations
	async getChildren(taskId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.findChildren(taskId);
	}

	async getDescendants(taskId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.findDescendants(task.path);
	}

	async getAncestors(taskId: string) {
		const task = await taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		await this.verifyProjectAccess(task.projectId);
		return taskRepository.findAncestors(task.path);
	}
}

export const taskService = new TaskService();
