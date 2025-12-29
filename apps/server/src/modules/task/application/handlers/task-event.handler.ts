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
	type TaskCreatedEvent,
	type TaskDeletedEvent,
	type TaskStatusChangedEvent,
	type TaskUpdatedEvent,
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
 * Register all task event handlers
 */
export function registerTaskEventHandlers(): () => void {
	const statusHandler = new TaskStatusChangedHandler();
	const createdHandler = new TaskCreatedHandler();
	const updatedHandler = new TaskUpdatedHandler();
	const deletedHandler = new TaskDeletedHandler();

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

	return () => {
		unsubscribeStatus();
		unsubscribeCreated();
		unsubscribeUpdated();
		unsubscribeDeleted();
	};
}
