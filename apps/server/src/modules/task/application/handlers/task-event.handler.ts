// ============================================
// TASK EVENT HANDLER
// ============================================

import {
	type DomainEvent,
	type EventHandler,
	eventBus,
} from "@grandplan/events";
import {
	TASK_EVENTS,
	type TaskCreatedEvent,
	type TaskStatusChangedEvent,
} from "../../domain/events/task.events.js";
import { taskCascadeService } from "../services/task-cascade.service.js";

/**
 * Handler for task status changed events
 * Triggers cascade logic for completion and blocking
 */
export class TaskStatusChangedHandler
	implements EventHandler<DomainEvent<TaskStatusChangedEvent>>
{
	async handle(event: DomainEvent<TaskStatusChangedEvent>): Promise<void> {
		const { taskId, previousStatus, newStatus, changedById, aiTriggered } =
			event.payload;

		// Skip if this was already triggered by cascade logic to prevent infinite loops
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
 * Can be used for notifications, analytics, etc.
 */
export class TaskCreatedHandler
	implements EventHandler<DomainEvent<TaskCreatedEvent>>
{
	async handle(event: DomainEvent<TaskCreatedEvent>): Promise<void> {
		const { taskId, title, projectId, createdById } = event.payload;
		console.log(
			`[TaskEventHandler] Task created: ${taskId} - ${title} in project ${projectId} by ${createdById}`,
		);

		// Could trigger:
		// - Notifications to project members
		// - Analytics tracking
		// - Integration syncs
	}
}

/**
 * Register all task event handlers
 */
export function registerTaskEventHandlers(): () => void {
	const statusHandler = new TaskStatusChangedHandler();
	const createdHandler = new TaskCreatedHandler();

	const unsubscribeStatus = eventBus.registerHandler(
		TASK_EVENTS.STATUS_CHANGED as "task.statusChanged",
		statusHandler as unknown as EventHandler,
	);

	const unsubscribeCreated = eventBus.registerHandler(
		TASK_EVENTS.CREATED as "task.created",
		createdHandler as unknown as EventHandler,
	);

	return () => {
		unsubscribeStatus();
		unsubscribeCreated();
	};
}
