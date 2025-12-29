// ============================================
// TASK EVENT HANDLER
// ============================================

import {
	type DomainEvent,
	type EventHandler,
	eventBus,
} from "@grandplan/events";
import { realtimeServer } from "@grandplan/realtime";
import {
	TASK_EVENTS,
	type TaskAssignedEvent,
	type TaskCommentAddedEvent,
	type TaskCommentDeletedEvent,
	type TaskCommentUpdatedEvent,
	type TaskCreatedEvent,
	type TaskDeletedEvent,
	type TaskMovedEvent,
	type TaskStatusChangedEvent,
	type TaskUnassignedEvent,
	type TaskUpdatedEvent,
	type DependencyAddedEvent,
	type DependencyRemovedEvent,
} from "../../domain/events/task.events.js";
import { taskCascadeService } from "../services/task-cascade.service.js";
import { taskRepository } from "../../infrastructure/repositories/task.repository.js";

/**
 * Handler for task status changed events
 * Triggers cascade logic for completion and blocking
 * Emits realtime event to connected clients
 */
export class TaskStatusChangedHandler
	implements EventHandler<DomainEvent<TaskStatusChangedEvent>>
{
	async handle(event: DomainEvent<TaskStatusChangedEvent>): Promise<void> {
		const { taskId, previousStatus, newStatus, changedById, aiTriggered } =
			event.payload;

		// Get task for project context
		const task = await taskRepository.findById(taskId);

		// Emit realtime event for status change
		if (task) {
			try {
				realtimeServer.emitToProject(task.projectId, "task:updated", {
					taskId,
					changes: { status: newStatus, previousStatus },
					userId: changedById,
					timestamp: new Date(),
				});
			} catch {
				// Realtime server may not be initialized yet
			}
		}

		// Skip cascade if this was already triggered by cascade logic to prevent infinite loops
		if (aiTriggered) {
			return;
		}

		// Handle completion cascade
		if (newStatus === "COMPLETED" && previousStatus !== "COMPLETED") {
			console.log(
				`[TaskEventHandler] Task ${taskId} completed, triggering cascade`,
			);
			const result = await taskCascadeService.onTaskCompleted(
				taskId,
				changedById,
			);

			if (result.updatedTasks.length > 0) {
				console.log(
					`[TaskEventHandler] Cascade updated ${result.updatedTasks.length} tasks`,
				);
			}
		}

		// Handle reopening cascade
		if (previousStatus === "COMPLETED" && newStatus !== "COMPLETED") {
			console.log(`[TaskEventHandler] Task ${taskId} reopened`);
			// This is handled in the service layer when the parent relationship is known
		}
	}
}

/**
 * Handler for task created events
 * Emits realtime event to connected clients
 */
export class TaskCreatedHandler
	implements EventHandler<DomainEvent<TaskCreatedEvent>>
{
	async handle(event: DomainEvent<TaskCreatedEvent>): Promise<void> {
		const { taskId, title, projectId, createdById, nodeType } = event.payload;
		console.log(
			`[TaskEventHandler] Task created: ${taskId} - ${title} in project ${projectId}`,
		);

		// Emit realtime event to project room
		try {
			realtimeServer.emitToProject(projectId, "task:created", {
				id: taskId,
				data: { taskId, title, projectId, nodeType, createdById },
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for task updated events
 * Emits realtime event to connected clients
 */
export class TaskUpdatedHandler
	implements EventHandler<DomainEvent<TaskUpdatedEvent>>
{
	async handle(event: DomainEvent<TaskUpdatedEvent>): Promise<void> {
		const { taskId, changes, updatedById } = event.payload;

		// Get task to find project
		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(`[TaskEventHandler] Task updated: ${taskId}`);

		// Emit realtime event
		try {
			realtimeServer.emitToProject(task.projectId, "task:updated", {
				taskId,
				changes,
				userId: updatedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for task deleted events
 * Emits realtime event to connected clients
 */
export class TaskDeletedHandler
	implements EventHandler<DomainEvent<TaskDeletedEvent>>
{
	async handle(event: DomainEvent<TaskDeletedEvent>): Promise<void> {
		const { taskId, projectId } = event.payload;

		console.log(`[TaskEventHandler] Task deleted: ${taskId}`);

		// Emit realtime event
		try {
			realtimeServer.emitToProject(projectId, "task:deleted", taskId);
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for task assigned events
 * Emits realtime event for assignment notifications
 */
export class TaskAssignedHandler
	implements EventHandler<DomainEvent<TaskAssignedEvent>>
{
	async handle(event: DomainEvent<TaskAssignedEvent>): Promise<void> {
		const { taskId, assigneeId, previousAssigneeId, assignedById } =
			event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(
			`[TaskEventHandler] Task ${taskId} assigned to ${assigneeId}`,
		);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:updated", {
				taskId,
				changes: { assigneeId, previousAssigneeId },
				userId: assignedById,
				timestamp: new Date(),
			});

			// Notify the assignee directly
			realtimeServer.emitToUser(assigneeId, "notification:new", {
				type: "task.assigned",
				title: `You have been assigned to: ${task.title}`,
				taskId,
				projectId: task.projectId,
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for task unassigned events
 * Emits realtime event for unassignment notifications
 */
export class TaskUnassignedHandler
	implements EventHandler<DomainEvent<TaskUnassignedEvent>>
{
	async handle(event: DomainEvent<TaskUnassignedEvent>): Promise<void> {
		const { taskId, previousAssigneeId, unassignedById } = event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(
			`[TaskEventHandler] Task ${taskId} unassigned from ${previousAssigneeId}`,
		);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:updated", {
				taskId,
				changes: { assigneeId: null, previousAssigneeId },
				userId: unassignedById,
				timestamp: new Date(),
			});

			// Notify the previous assignee
			realtimeServer.emitToUser(previousAssigneeId, "notification:new", {
				type: "task.unassigned",
				title: `You have been unassigned from: ${task.title}`,
				taskId,
				projectId: task.projectId,
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for task moved events
 * Emits realtime event when task hierarchy changes
 */
export class TaskMovedHandler
	implements EventHandler<DomainEvent<TaskMovedEvent>>
{
	async handle(event: DomainEvent<TaskMovedEvent>): Promise<void> {
		const { taskId, previousParentId, newParentId, previousPath, newPath, movedById } =
			event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(
			`[TaskEventHandler] Task ${taskId} moved from ${previousParentId ?? "root"} to ${newParentId ?? "root"}`,
		);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:moved", {
				taskId,
				previousParentId,
				newParentId,
				previousPath,
				newPath,
				userId: movedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for dependency added events
 * Emits realtime event when task dependencies change
 */
export class DependencyAddedHandler
	implements EventHandler<DomainEvent<DependencyAddedEvent>>
{
	async handle(event: DomainEvent<DependencyAddedEvent>): Promise<void> {
		const { dependencyId, fromTaskId, toTaskId, type, createdById } =
			event.payload;

		const fromTask = await taskRepository.findById(fromTaskId);
		if (!fromTask) return;

		console.log(
			`[TaskEventHandler] Dependency added: ${fromTaskId} ${type} ${toTaskId}`,
		);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(fromTask.projectId, "task:dependencyAdded", {
				dependencyId,
				fromTaskId,
				toTaskId,
				type,
				userId: createdById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for dependency removed events
 * Emits realtime event when task dependencies are removed
 */
export class DependencyRemovedHandler
	implements EventHandler<DomainEvent<DependencyRemovedEvent>>
{
	async handle(event: DomainEvent<DependencyRemovedEvent>): Promise<void> {
		const { dependencyId, fromTaskId, toTaskId, type, removedById } =
			event.payload;

		const fromTask = await taskRepository.findById(fromTaskId);
		if (!fromTask) return;

		console.log(
			`[TaskEventHandler] Dependency removed: ${fromTaskId} ${type} ${toTaskId}`,
		);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(fromTask.projectId, "task:dependencyRemoved", {
				dependencyId,
				fromTaskId,
				toTaskId,
				type,
				userId: removedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for comment added events
 * Emits realtime event for comment notifications
 */
export class CommentAddedHandler
	implements EventHandler<DomainEvent<TaskCommentAddedEvent>>
{
	async handle(event: DomainEvent<TaskCommentAddedEvent>): Promise<void> {
		const { commentId, taskId, authorId, content } = event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(`[TaskEventHandler] Comment added to task ${taskId}`);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:commentAdded", {
				commentId,
				taskId,
				authorId,
				content,
				timestamp: new Date(),
			});

			// Notify task assignee if different from comment author
			if (task.assigneeId && task.assigneeId !== authorId) {
				realtimeServer.emitToUser(task.assigneeId, "notification:new", {
					type: "task.commented",
					title: `New comment on: ${task.title}`,
					taskId,
					projectId: task.projectId,
					commentId,
				});
			}
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for comment updated events
 * Emits realtime event when comments are edited
 */
export class CommentUpdatedHandler
	implements EventHandler<DomainEvent<TaskCommentUpdatedEvent>>
{
	async handle(event: DomainEvent<TaskCommentUpdatedEvent>): Promise<void> {
		const { commentId, taskId, content, updatedById } = event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(`[TaskEventHandler] Comment ${commentId} updated on task ${taskId}`);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:commentUpdated", {
				commentId,
				taskId,
				content,
				userId: updatedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for comment deleted events
 * Emits realtime event when comments are deleted
 */
export class CommentDeletedHandler
	implements EventHandler<DomainEvent<TaskCommentDeletedEvent>>
{
	async handle(event: DomainEvent<TaskCommentDeletedEvent>): Promise<void> {
		const { commentId, taskId, deletedById } = event.payload;

		const task = await taskRepository.findById(taskId);
		if (!task) return;

		console.log(`[TaskEventHandler] Comment ${commentId} deleted from task ${taskId}`);

		// Emit realtime event to project
		try {
			realtimeServer.emitToProject(task.projectId, "task:commentDeleted", {
				commentId,
				taskId,
				userId: deletedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Register all task event handlers
 */
export function registerTaskEventHandlers(): () => void {
	const statusHandler = new TaskStatusChangedHandler();
	const createdHandler = new TaskCreatedHandler();
	const updatedHandler = new TaskUpdatedHandler();
	const deletedHandler = new TaskDeletedHandler();
	const assignedHandler = new TaskAssignedHandler();
	const unassignedHandler = new TaskUnassignedHandler();
	const movedHandler = new TaskMovedHandler();
	const dependencyAddedHandler = new DependencyAddedHandler();
	const dependencyRemovedHandler = new DependencyRemovedHandler();
	const commentAddedHandler = new CommentAddedHandler();
	const commentUpdatedHandler = new CommentUpdatedHandler();
	const commentDeletedHandler = new CommentDeletedHandler();

	const unsubscribeStatus = eventBus.registerHandler(
		TASK_EVENTS.STATUS_CHANGED as "task.statusChanged",
		statusHandler as unknown as EventHandler,
	);

	const unsubscribeCreated = eventBus.registerHandler(
		TASK_EVENTS.CREATED as "task.created",
		createdHandler as unknown as EventHandler,
	);

	const unsubscribeUpdated = eventBus.registerHandler(
		TASK_EVENTS.UPDATED as "task.updated",
		updatedHandler as unknown as EventHandler,
	);

	const unsubscribeDeleted = eventBus.registerHandler(
		TASK_EVENTS.DELETED as "task.deleted",
		deletedHandler as unknown as EventHandler,
	);

	const unsubscribeAssigned = eventBus.registerHandler(
		TASK_EVENTS.ASSIGNED as "task.assigned",
		assignedHandler as unknown as EventHandler,
	);

	const unsubscribeUnassigned = eventBus.registerHandler(
		TASK_EVENTS.UNASSIGNED as "task.unassigned",
		unassignedHandler as unknown as EventHandler,
	);

	const unsubscribeMoved = eventBus.registerHandler(
		TASK_EVENTS.MOVED as "task.moved",
		movedHandler as unknown as EventHandler,
	);

	const unsubscribeDependencyAdded = eventBus.registerHandler(
		TASK_EVENTS.DEPENDENCY_ADDED as "task.dependencyAdded",
		dependencyAddedHandler as unknown as EventHandler,
	);

	const unsubscribeDependencyRemoved = eventBus.registerHandler(
		TASK_EVENTS.DEPENDENCY_REMOVED as "task.dependencyRemoved",
		dependencyRemovedHandler as unknown as EventHandler,
	);

	const unsubscribeCommentAdded = eventBus.registerHandler(
		TASK_EVENTS.COMMENT_ADDED as "task.commentAdded",
		commentAddedHandler as unknown as EventHandler,
	);

	const unsubscribeCommentUpdated = eventBus.registerHandler(
		TASK_EVENTS.COMMENT_UPDATED as "task.commentUpdated",
		commentUpdatedHandler as unknown as EventHandler,
	);

	const unsubscribeCommentDeleted = eventBus.registerHandler(
		TASK_EVENTS.COMMENT_DELETED as "task.commentDeleted",
		commentDeletedHandler as unknown as EventHandler,
	);

	return () => {
		unsubscribeStatus();
		unsubscribeCreated();
		unsubscribeUpdated();
		unsubscribeDeleted();
		unsubscribeAssigned();
		unsubscribeUnassigned();
		unsubscribeMoved();
		unsubscribeDependencyAdded();
		unsubscribeDependencyRemoved();
		unsubscribeCommentAdded();
		unsubscribeCommentUpdated();
		unsubscribeCommentDeleted();
	};
}
