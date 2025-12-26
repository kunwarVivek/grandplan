// ============================================
// TASK EVENT HELPERS
// ============================================

import { eventBus } from "./event-bus.js";
import type {
	EventMetadata,
	TaskAssignedPayload,
	TaskCreatedPayload,
	TaskDecomposedPayload,
	TaskStatusChangedPayload,
	TaskUpdatedPayload,
} from "./types.js";

// Helper functions for emitting task events
export const taskEvents = {
	async created(
		payload: TaskCreatedPayload,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.created", payload, metadata);
	},

	async updated(
		payload: TaskUpdatedPayload,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.updated", payload, metadata);
	},

	async statusChanged(
		payload: TaskStatusChangedPayload,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.statusChanged", payload, metadata);
	},

	async assigned(
		payload: TaskAssignedPayload,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.assigned", payload, metadata);
	},

	async unassigned(
		taskId: string,
		previousAssigneeId: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit(
			"task.unassigned",
			{ id: taskId, previousAssigneeId },
			metadata,
		);
	},

	async decomposed(
		payload: TaskDecomposedPayload,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.decomposed", payload, metadata);
	},

	async completed(
		taskId: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit(
			"task.completed",
			{ id: taskId, completedAt: new Date() },
			metadata,
		);
	},

	async deleted(
		taskId: string,
		projectId: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("task.deleted", { id: taskId, projectId }, metadata);
	},
};

// Helper functions for emitting comment events
export const commentEvents = {
	async created(
		id: string,
		taskId: string,
		content: string,
		authorId?: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit(
			"comment.created",
			{ id, taskId, authorId, content },
			metadata,
		);
	},

	async updated(
		id: string,
		taskId: string,
		content: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("comment.updated", { id, taskId, content }, metadata);
	},

	async deleted(
		id: string,
		taskId: string,
		metadata?: Partial<EventMetadata>,
	): Promise<void> {
		await eventBus.emit("comment.deleted", { id, taskId }, metadata);
	},
};
