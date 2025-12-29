// ============================================
// TASK CASCADE SERVICE
// ============================================

import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import type { TaskStatus } from "@prisma/client";
import {
	isTaskBlocking,
	isTaskCompleted,
} from "../../domain/entities/task-node.entity.js";
import { TASK_EVENTS } from "../../domain/events/task.events.js";
import { taskRepository } from "../../infrastructure/repositories/task.repository.js";

export interface CascadeResult {
	updatedTasks: Array<{
		id: string;
		previousStatus: TaskStatus;
		newStatus: TaskStatus;
	}>;
	blockedTasks: Array<{
		id: string;
		blockedBy: string[];
	}>;
}

export class TaskCascadeService {
	/**
	 * Handle status cascade when a task is completed
	 * 1. Check if all siblings are completed -> complete parent
	 * 2. Unblock dependent tasks if this task was blocking them
	 */
	async onTaskCompleted(
		taskId: string,
		userId: string,
	): Promise<CascadeResult> {
		const result: CascadeResult = {
			updatedTasks: [],
			blockedTasks: [],
		};

		const task = await taskRepository.findById(taskId);
		if (!task) return result;

		// 1. Check parent completion
		if (task.parentId) {
			const parentCompleted = await this.checkAndCompleteParent(
				task.parentId,
				userId,
			);
			if (parentCompleted) {
				result.updatedTasks.push(parentCompleted);
				// Recursively check ancestors
				const ancestorResults = await this.onTaskCompleted(
					task.parentId,
					userId,
				);
				result.updatedTasks.push(...ancestorResults.updatedTasks);
			}
		}

		// 2. Unblock dependent tasks
		const unblockedTasks = await this.unblockDependentTasks(taskId, userId);
		result.updatedTasks.push(...unblockedTasks);

		return result;
	}

	/**
	 * Check if all children of a parent are completed, and complete the parent if so
	 */
	async checkAndCompleteParent(
		parentId: string,
		userId: string,
	): Promise<{
		id: string;
		previousStatus: TaskStatus;
		newStatus: TaskStatus;
	} | null> {
		const parent = await taskRepository.findById(parentId);
		if (!parent || isTaskCompleted(parent.status)) {
			return null;
		}

		const childrenCounts = await taskRepository.countChildrenByStatus(parentId);
		const totalChildren = Object.values(childrenCounts).reduce(
			(a, b) => a + b,
			0,
		);

		if (totalChildren === 0) {
			return null;
		}

		const completedChildren =
			childrenCounts.COMPLETED + childrenCounts.CANCELLED;

		if (completedChildren === totalChildren) {
			// All children are completed, complete the parent (atomic status + history)
			const previousStatus = parent.status;
			await taskRepository.updateStatusWithHistory(parentId, "COMPLETED", {
				previousStatus,
				reason: "All child tasks completed",
				actorId: userId,
				aiTriggered: false,
			});

			// Emit event (after transaction commits)
			await eventBus.emit(TASK_EVENTS.STATUS_CHANGED, {
				taskId: parentId,
				previousStatus,
				newStatus: "COMPLETED",
				reason: "All child tasks completed",
				changedById: userId,
				aiTriggered: false,
			});

			await eventBus.emit(TASK_EVENTS.CHILDREN_COMPLETED, {
				parentTaskId: parentId,
				completedChildIds: [], // Could be populated if needed
				triggeredById: userId,
			});

			return { id: parentId, previousStatus, newStatus: "COMPLETED" };
		}

		return null;
	}

	/**
	 * Unblock tasks that were waiting on the completed task
	 */
	async unblockDependentTasks(
		completedTaskId: string,
		userId: string,
	): Promise<
		Array<{ id: string; previousStatus: TaskStatus; newStatus: TaskStatus }>
	> {
		const unblockedTasks: Array<{
			id: string;
			previousStatus: TaskStatus;
			newStatus: TaskStatus;
		}> = [];

		// Find tasks that this task was blocking
		const blockedDependencies = await db.taskDependency.findMany({
			where: {
				fromTaskId: completedTaskId,
				type: "BLOCKS",
			},
			include: {
				toTask: true,
			},
		});

		for (const dep of blockedDependencies) {
			const blockedTask = dep.toTask;

			// Skip if already completed or not blocked
			if (blockedTask.status !== "BLOCKED") {
				continue;
			}

			// Check if there are other blocking tasks still incomplete
			const otherBlockingTasks = await db.taskDependency.findMany({
				where: {
					toTaskId: blockedTask.id,
					type: "BLOCKS",
					fromTaskId: { not: completedTaskId },
				},
				include: {
					fromTask: true,
				},
			});

			const stillBlocked = otherBlockingTasks.some((d) =>
				isTaskBlocking(d.fromTask.status),
			);

			if (!stillBlocked) {
				// Unblock the task - move it to PENDING (atomic status + history)
				const previousStatus = blockedTask.status;
				await taskRepository.updateStatusWithHistory(blockedTask.id, "PENDING", {
					previousStatus,
					reason: `Unblocked: ${completedTaskId} completed`,
					actorId: userId,
					aiTriggered: false,
				});

				// Emit event
				await eventBus.emit(TASK_EVENTS.STATUS_CHANGED, {
					taskId: blockedTask.id,
					previousStatus,
					newStatus: "PENDING",
					reason: "Unblocked: dependency completed",
					changedById: userId,
					aiTriggered: false,
				});

				unblockedTasks.push({
					id: blockedTask.id,
					previousStatus,
					newStatus: "PENDING",
				});
			}
		}

		return unblockedTasks;
	}

	/**
	 * Handle status cascade when a blocking dependency is added
	 */
	async onDependencyAdded(
		fromTaskId: string,
		toTaskId: string,
		userId: string,
	): Promise<CascadeResult> {
		const result: CascadeResult = {
			updatedTasks: [],
			blockedTasks: [],
		};

		const fromTask = await taskRepository.findById(fromTaskId);
		const toTask = await taskRepository.findById(toTaskId);

		if (!fromTask || !toTask) return result;

		// If the blocking task is not completed, block the dependent task
		if (
			isTaskBlocking(fromTask.status) &&
			!isTaskCompleted(toTask.status) &&
			toTask.status !== "BLOCKED"
		) {
			const previousStatus = toTask.status;
			// Block the task (atomic status + history)
			await taskRepository.updateStatusWithHistory(toTaskId, "BLOCKED", {
				previousStatus,
				reason: `Blocked by task: ${fromTaskId}`,
				actorId: userId,
				aiTriggered: false,
			});

			// Emit events
			await eventBus.emit(TASK_EVENTS.STATUS_CHANGED, {
				taskId: toTaskId,
				previousStatus,
				newStatus: "BLOCKED",
				reason: `Blocked by task: ${fromTaskId}`,
				changedById: userId,
				aiTriggered: false,
			});

			await eventBus.emit(TASK_EVENTS.DEPENDENCY_BLOCKED, {
				blockedTaskId: toTaskId,
				blockingTaskId: fromTaskId,
				dependencyType: "BLOCKS",
			});

			result.updatedTasks.push({
				id: toTaskId,
				previousStatus,
				newStatus: "BLOCKED",
			});

			result.blockedTasks.push({
				id: toTaskId,
				blockedBy: [fromTaskId],
			});
		}

		return result;
	}

	/**
	 * Reopen a parent task when a child is reopened/uncompleted
	 */
	async onChildReopened(
		parentId: string,
		childId: string,
		userId: string,
	): Promise<void> {
		const parent = await taskRepository.findById(parentId);
		if (!parent || !isTaskCompleted(parent.status)) {
			return;
		}

		// Reopen the parent (atomic status + history)
		const previousStatus = parent.status;
		await taskRepository.updateStatusWithHistory(parentId, "IN_PROGRESS", {
			previousStatus,
			reason: `Child task ${childId} was reopened`,
			actorId: userId,
			aiTriggered: false,
		});

		// Emit event
		await eventBus.emit(TASK_EVENTS.STATUS_CHANGED, {
			taskId: parentId,
			previousStatus,
			newStatus: "IN_PROGRESS",
			reason: "Child task reopened",
			changedById: userId,
			aiTriggered: false,
		});

		// Recursively check ancestors
		if (parent.parentId) {
			await this.onChildReopened(parent.parentId, parentId, userId);
		}
	}

	/**
	 * Check for circular dependencies before adding a dependency
	 */
	async wouldCreateCycle(
		fromTaskId: string,
		toTaskId: string,
	): Promise<boolean> {
		// Check if toTaskId is an ancestor of fromTaskId in the dependency graph
		const visited = new Set<string>();
		const queue = [fromTaskId];

		while (queue.length > 0) {
			const current = queue.shift()!;
			if (current === toTaskId) {
				return true;
			}

			if (visited.has(current)) {
				continue;
			}
			visited.add(current);

			// Get all tasks that this task blocks
			const dependencies = await db.taskDependency.findMany({
				where: {
					toTaskId: current,
					type: { in: ["BLOCKS", "REQUIRED_BY"] },
				},
			});

			for (const dep of dependencies) {
				queue.push(dep.fromTaskId);
			}
		}

		return false;
	}

	/**
	 * Validate and potentially fix task hierarchy after a move
	 */
	async validateHierarchyAfterMove(taskId: string): Promise<void> {
		const task = await taskRepository.findByIdWithRelations(taskId);
		if (!task) return;

		// Check if this task was completed but now has incomplete children
		if (isTaskCompleted(task.status) && task.children.length > 0) {
			const hasIncompleteChildren = task.children.some(
				(child) => !isTaskCompleted(child.status),
			);
			if (hasIncompleteChildren) {
				// Reopen the task (atomic status + history)
				await taskRepository.updateStatusWithHistory(taskId, "IN_PROGRESS", {
					previousStatus: task.status,
					reason: "Reopened due to incomplete child tasks after move",
					actorId: null,
					aiTriggered: true,
				});
			}
		}
	}
}

export const taskCascadeService = new TaskCascadeService();
