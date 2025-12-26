// ============================================
// PROJECT SERVICE
// ============================================

import { auditService } from "@grandplan/audit";
import { ForbiddenError, NotFoundError } from "@grandplan/core/errors";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import type { ProjectStatus } from "@prisma/client";
import { workspaceRepository } from "../../../workspace/infrastructure/repositories/workspace.repository.js";
import type { CreateProjectDto } from "../../api/dto/create-project.dto.js";
import type { UpdateProjectDto } from "../../api/dto/update-project.dto.js";
import { PROJECT_EVENTS } from "../../domain/events/project.events.js";
import {
	type ProjectQueryOptions,
	projectRepository,
} from "../../infrastructure/repositories/project.repository.js";

export class ProjectService {
	async create(dto: CreateProjectDto) {
		const tenant = getCurrentTenant();

		// Verify workspace exists and user has access
		const workspace = await workspaceRepository.findById(dto.workspaceId);
		if (!workspace) {
			throw new NotFoundError("Workspace", dto.workspaceId);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check if user is a member of the workspace
		const isMember = await workspaceRepository.isMember(
			dto.workspaceId,
			tenant.userId,
		);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		const project = await projectRepository.create({
			name: dto.name,
			description: dto.description,
			workspaceId: dto.workspaceId,
			color: dto.color,
			icon: dto.icon,
		});

		await eventBus.emit(PROJECT_EVENTS.CREATED, {
			projectId: project.id,
			name: project.name,
			workspaceId: project.workspaceId,
			createdById: tenant.userId,
			createdAt: project.createdAt,
		});

		await auditService.log({
			action: "project.created",
			resourceType: "project",
			resourceId: project.id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: project.name, workspaceId: project.workspaceId },
		});

		return project;
	}

	async findById(id: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		// Check if user is a member of the workspace
		const isMember = await workspaceRepository.isMember(
			project.workspaceId,
			tenant.userId,
		);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		return project;
	}

	async findByIdWithTasks(id: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithTasks(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		const workspace = await workspaceRepository.findById(project.workspaceId);
		if (!workspace || workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		// Check if user is a member of the workspace
		const isMember = await workspaceRepository.isMember(
			project.workspaceId,
			tenant.userId,
		);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		return project;
	}

	async list(options: ProjectQueryOptions = {}) {
		const tenant = getCurrentTenant();

		if (options.workspaceId) {
			// Verify workspace access
			const workspace = await workspaceRepository.findById(options.workspaceId);
			if (!workspace || workspace.organizationId !== tenant.organizationId) {
				throw new ForbiddenError("Access denied to this workspace");
			}

			const isMember = await workspaceRepository.isMember(
				options.workspaceId,
				tenant.userId,
			);
			if (!isMember && !tenant.isOrganizationAdmin()) {
				throw new ForbiddenError("You are not a member of this workspace");
			}

			return projectRepository.findByWorkspace(options.workspaceId, options);
		}

		return projectRepository.findByOrganization(tenant.organizationId, options);
	}

	async update(id: string, dto: UpdateProjectDto) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		// Check workspace membership
		const member = await workspaceRepository.getMember(
			project.workspaceId,
			tenant.userId,
		);
		if (!member && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		// Viewers cannot update projects
		if (member?.role === "VIEWER" && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You do not have permission to update projects");
		}

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		if (dto.name !== undefined && dto.name !== project.name) {
			previousValues.name = project.name;
			changes.name = dto.name;
		}
		if (
			dto.description !== undefined &&
			dto.description !== project.description
		) {
			previousValues.description = project.description;
			changes.description = dto.description;
		}
		if (dto.status !== undefined && dto.status !== project.status) {
			previousValues.status = project.status;
			changes.status = dto.status;
		}
		if (dto.color !== undefined && dto.color !== project.color) {
			previousValues.color = project.color;
			changes.color = dto.color;
		}
		if (dto.icon !== undefined && dto.icon !== project.icon) {
			previousValues.icon = project.icon;
			changes.icon = dto.icon;
		}

		const updated = await projectRepository.update(
			id,
			dto as Partial<{
				name: string;
				description: string | null;
				status: ProjectStatus;
				color: string | null;
				icon: string | null;
			}>,
		);

		if (Object.keys(changes).length > 0) {
			await eventBus.emit(PROJECT_EVENTS.UPDATED, {
				projectId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			await auditService.log({
				action: "project.updated",
				resourceType: "project",
				resourceId: id,
				userId: tenant.userId,
				organizationId: tenant.organizationId,
				metadata: { changes, previousValues },
			});

			// Emit status change event if status was changed
			if (changes.status) {
				await eventBus.emit(PROJECT_EVENTS.STATUS_CHANGED, {
					projectId: id,
					previousStatus: previousValues.status as string,
					newStatus: changes.status as string,
					changedById: tenant.userId,
				});
			}
		}

		return updated;
	}

	async delete(id: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		// Check workspace membership and role
		const member = await workspaceRepository.getMember(
			project.workspaceId,
			tenant.userId,
		);
		if (!member && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		// Only admins and owners can delete projects
		if (
			member &&
			!["OWNER", "ADMIN"].includes(member.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError("You do not have permission to delete projects");
		}

		await projectRepository.delete(id);

		await eventBus.emit(PROJECT_EVENTS.DELETED, {
			projectId: id,
			name: project.name,
			workspaceId: project.workspaceId,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "project.deleted",
			resourceType: "project",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: project.name, workspaceId: project.workspaceId },
		});
	}

	async archive(id: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		if (project.status !== "ACTIVE") {
			throw new ForbiddenError("Only active projects can be archived");
		}

		const updated = await projectRepository.updateStatus(id, "ARCHIVED");

		await eventBus.emit(PROJECT_EVENTS.ARCHIVED, {
			projectId: id,
			name: project.name,
			workspaceId: project.workspaceId,
			archivedById: tenant.userId,
		});

		await auditService.log({
			action: "project.archived",
			resourceType: "project",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: project.name },
		});

		return updated;
	}

	async getStats(id: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(id);

		if (!project) {
			throw new NotFoundError("Project", id);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		return projectRepository.getProjectStats(id);
	}

	// YJS Document operations
	async getYjsDocument(projectId: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(projectId);

		if (!project) {
			throw new NotFoundError("Project", projectId);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		const doc = await projectRepository.getYjsDocument(projectId);
		if (!doc) {
			return null;
		}

		return {
			id: doc.id,
			state: doc.state.toString("base64"),
		};
	}

	async saveYjsDocument(projectId: string, stateBase64: string) {
		const tenant = getCurrentTenant();
		const project = await projectRepository.findByIdWithWorkspace(projectId);

		if (!project) {
			throw new NotFoundError("Project", projectId);
		}

		if (project.workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this project");
		}

		const state = Buffer.from(stateBase64, "base64");
		await projectRepository.upsertYjsDocument(projectId, state);
	}
}

export const projectService = new ProjectService();
