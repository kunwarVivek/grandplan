// ============================================
// PROJECT EVENT HANDLER
// ============================================

import {
	type DomainEvent,
	type EventHandler,
	eventBus,
} from "@grandplan/events";
import { realtimeServer } from "@grandplan/realtime";
import {
	PROJECT_EVENTS,
	type ProjectArchivedEvent,
	type ProjectCreatedEvent,
	type ProjectDeletedEvent,
	type ProjectStatusChangedEvent,
	type ProjectUpdatedEvent,
} from "../../domain/events/project.events.js";
import { projectRepository } from "../../infrastructure/repositories/project.repository.js";

/**
 * Handler for project created events
 * Emits realtime event to workspace members
 */
export class ProjectCreatedHandler
	implements EventHandler<DomainEvent<ProjectCreatedEvent>>
{
	async handle(event: DomainEvent<ProjectCreatedEvent>): Promise<void> {
		const { projectId, name, workspaceId, createdById } = event.payload;

		console.log(
			`[ProjectEventHandler] Project created: ${projectId} - ${name} in workspace ${workspaceId}`,
		);

		// Emit realtime event to workspace
		try {
			realtimeServer.emitToWorkspace(workspaceId, "project:created", {
				id: projectId,
				data: { projectId, name, workspaceId, createdById },
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for project updated events
 * Emits realtime event to workspace members
 */
export class ProjectUpdatedHandler
	implements EventHandler<DomainEvent<ProjectUpdatedEvent>>
{
	async handle(event: DomainEvent<ProjectUpdatedEvent>): Promise<void> {
		const { projectId, changes, updatedById } = event.payload;

		const project = await projectRepository.findById(projectId);
		if (!project) return;

		console.log(`[ProjectEventHandler] Project updated: ${projectId}`);

		// Emit realtime event to workspace
		try {
			realtimeServer.emitToWorkspace(project.workspaceId, "project:updated", {
				projectId,
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
 * Handler for project status changed events
 * Emits realtime event to workspace members
 */
export class ProjectStatusChangedHandler
	implements EventHandler<DomainEvent<ProjectStatusChangedEvent>>
{
	async handle(event: DomainEvent<ProjectStatusChangedEvent>): Promise<void> {
		const { projectId, previousStatus, newStatus, changedById } = event.payload;

		const project = await projectRepository.findById(projectId);
		if (!project) return;

		console.log(
			`[ProjectEventHandler] Project ${projectId} status changed: ${previousStatus} -> ${newStatus}`,
		);

		// Emit realtime event to workspace
		try {
			realtimeServer.emitToWorkspace(project.workspaceId, "project:updated", {
				projectId,
				changes: { status: newStatus, previousStatus },
				userId: changedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for project deleted events
 * Emits realtime event to workspace members
 */
export class ProjectDeletedHandler
	implements EventHandler<DomainEvent<ProjectDeletedEvent>>
{
	async handle(event: DomainEvent<ProjectDeletedEvent>): Promise<void> {
		const { projectId, name, workspaceId, deletedById } = event.payload;

		console.log(`[ProjectEventHandler] Project deleted: ${projectId} - ${name}`);

		// Emit realtime event to workspace
		try {
			realtimeServer.emitToWorkspace(workspaceId, "project:deleted", {
				projectId,
				userId: deletedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Handler for project archived events
 * Emits realtime event to workspace members
 */
export class ProjectArchivedHandler
	implements EventHandler<DomainEvent<ProjectArchivedEvent>>
{
	async handle(event: DomainEvent<ProjectArchivedEvent>): Promise<void> {
		const { projectId, name, workspaceId, archivedById } = event.payload;

		console.log(`[ProjectEventHandler] Project archived: ${projectId} - ${name}`);

		// Emit realtime event to workspace
		try {
			realtimeServer.emitToWorkspace(workspaceId, "project:archived", {
				projectId,
				userId: archivedById,
				timestamp: new Date(),
			});
		} catch {
			// Realtime server may not be initialized yet
		}
	}
}

/**
 * Register all project event handlers
 */
export function registerProjectEventHandlers(): () => void {
	const createdHandler = new ProjectCreatedHandler();
	const updatedHandler = new ProjectUpdatedHandler();
	const statusChangedHandler = new ProjectStatusChangedHandler();
	const deletedHandler = new ProjectDeletedHandler();
	const archivedHandler = new ProjectArchivedHandler();

	const unsubscribeCreated = eventBus.registerHandler(
		PROJECT_EVENTS.CREATED as "project.created",
		createdHandler as unknown as EventHandler,
	);

	const unsubscribeUpdated = eventBus.registerHandler(
		PROJECT_EVENTS.UPDATED as "project.updated",
		updatedHandler as unknown as EventHandler,
	);

	const unsubscribeStatusChanged = eventBus.registerHandler(
		PROJECT_EVENTS.STATUS_CHANGED as "project.statusChanged",
		statusChangedHandler as unknown as EventHandler,
	);

	const unsubscribeDeleted = eventBus.registerHandler(
		PROJECT_EVENTS.DELETED as "project.deleted",
		deletedHandler as unknown as EventHandler,
	);

	const unsubscribeArchived = eventBus.registerHandler(
		PROJECT_EVENTS.ARCHIVED as "project.archived",
		archivedHandler as unknown as EventHandler,
	);

	return () => {
		unsubscribeCreated();
		unsubscribeUpdated();
		unsubscribeStatusChanged();
		unsubscribeDeleted();
		unsubscribeArchived();
	};
}
