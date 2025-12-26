// ============================================
// WORKSPACE SERVICE
// ============================================

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "@grandplan/core/errors";
import { slugify } from "@grandplan/core/utils";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import type { WorkspaceRole } from "@prisma/client";
import type {
	AddMemberDto,
	CreateWorkspaceDto,
	UpdateMemberRoleDto,
} from "../../api/dto/create-workspace.dto.js";
import type { UpdateWorkspaceDto } from "../../api/dto/update-workspace.dto.js";
import {
	canDeleteWorkspace,
	canEditWorkspace,
	canManageMembers,
} from "../../domain/entities/workspace.entity.js";
import { WORKSPACE_EVENTS } from "../../domain/events/workspace.events.js";
import {
	type WorkspaceQueryOptions,
	workspaceRepository,
} from "../../infrastructure/repositories/workspace.repository.js";

export class WorkspaceService {
	async create(dto: CreateWorkspaceDto) {
		const tenant = getCurrentTenant();
		const slug = dto.slug || slugify(dto.name);

		// Check for duplicate slug
		const exists = await workspaceRepository.slugExists(
			slug,
			tenant.organizationId,
		);
		if (exists) {
			throw new ConflictError(`Workspace with slug '${slug}' already exists`);
		}

		const workspace = await workspaceRepository.create({
			name: dto.name,
			slug,
			description: dto.description,
			organizationId: tenant.organizationId,
			ownerId: tenant.userId,
		});

		await eventBus.emit(WORKSPACE_EVENTS.CREATED, {
			workspaceId: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			organizationId: workspace.organizationId,
			ownerId: workspace.ownerId,
			createdAt: workspace.createdAt,
		});

		await auditService.log({
			action: "workspace.created",
			resourceType: "workspace",
			resourceId: workspace.id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: workspace.name, slug: workspace.slug },
		});

		return workspace;
	}

	async findById(id: string) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findByIdWithMembers(id);

		if (!workspace) {
			throw new NotFoundError("Workspace", id);
		}

		// Verify user has access to this workspace
		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		const isMember = await workspaceRepository.isMember(id, tenant.userId);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		return workspace;
	}

	async list(options: WorkspaceQueryOptions = {}) {
		const tenant = getCurrentTenant();

		// Org admins see all workspaces, regular users see their own
		if (tenant.isOrganizationAdmin()) {
			return workspaceRepository.findByOrganization(
				tenant.organizationId,
				options,
			);
		}

		return workspaceRepository.findByUser(
			tenant.userId,
			tenant.organizationId,
			options,
		);
	}

	async update(id: string, dto: UpdateWorkspaceDto) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(id);

		if (!workspace) {
			throw new NotFoundError("Workspace", id);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check user has permission to edit
		const member = await workspaceRepository.getMember(id, tenant.userId);
		if (!member && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		if (
			member &&
			!canEditWorkspace(member.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError(
				"You do not have permission to edit this workspace",
			);
		}

		// Check for slug conflict if updating slug
		if (dto.slug && dto.slug !== workspace.slug) {
			const exists = await workspaceRepository.slugExists(
				dto.slug,
				tenant.organizationId,
				id,
			);
			if (exists) {
				throw new ConflictError(
					`Workspace with slug '${dto.slug}' already exists`,
				);
			}
		}

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		if (dto.name !== undefined && dto.name !== workspace.name) {
			previousValues.name = workspace.name;
			changes.name = dto.name;
		}
		if (dto.slug !== undefined && dto.slug !== workspace.slug) {
			previousValues.slug = workspace.slug;
			changes.slug = dto.slug;
		}
		if (
			dto.description !== undefined &&
			dto.description !== workspace.description
		) {
			previousValues.description = workspace.description;
			changes.description = dto.description;
		}

		const updated = await workspaceRepository.update(id, dto);

		if (Object.keys(changes).length > 0) {
			await eventBus.emit(WORKSPACE_EVENTS.UPDATED, {
				workspaceId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			await auditService.log({
				action: "workspace.updated",
				resourceType: "workspace",
				resourceId: id,
				userId: tenant.userId,
				organizationId: tenant.organizationId,
				metadata: { changes, previousValues },
			});
		}

		return updated;
	}

	async delete(id: string) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(id);

		if (!workspace) {
			throw new NotFoundError("Workspace", id);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check user has permission to delete
		const member = await workspaceRepository.getMember(id, tenant.userId);
		if (!member && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		if (
			member &&
			!canDeleteWorkspace(member.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError("Only workspace owners can delete workspaces");
		}

		await workspaceRepository.delete(id);

		await eventBus.emit(WORKSPACE_EVENTS.DELETED, {
			workspaceId: id,
			name: workspace.name,
			organizationId: workspace.organizationId,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "workspace.deleted",
			resourceType: "workspace",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: workspace.name },
		});
	}

	async addMember(workspaceId: string, dto: AddMemberDto) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(workspaceId);

		if (!workspace) {
			throw new NotFoundError("Workspace", workspaceId);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check user has permission to manage members
		const member = await workspaceRepository.getMember(
			workspaceId,
			tenant.userId,
		);
		if (!member && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		if (
			member &&
			!canManageMembers(member.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError("You do not have permission to manage members");
		}

		// Check if user is already a member
		const existingMember = await workspaceRepository.getMember(
			workspaceId,
			dto.userId,
		);
		if (existingMember) {
			throw new ConflictError("User is already a member of this workspace");
		}

		await workspaceRepository.addMember(
			workspaceId,
			dto.userId,
			dto.role as WorkspaceRole,
		);

		await eventBus.emit(WORKSPACE_EVENTS.MEMBER_ADDED, {
			workspaceId,
			userId: dto.userId,
			role: dto.role,
			addedById: tenant.userId,
		});

		await auditService.log({
			action: "workspace.member_added",
			resourceType: "workspace",
			resourceId: workspaceId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { addedUserId: dto.userId, role: dto.role },
		});
	}

	async removeMember(workspaceId: string, userId: string) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(workspaceId);

		if (!workspace) {
			throw new NotFoundError("Workspace", workspaceId);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check user has permission to manage members
		const currentMember = await workspaceRepository.getMember(
			workspaceId,
			tenant.userId,
		);
		if (!currentMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		if (
			currentMember &&
			!canManageMembers(currentMember.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError("You do not have permission to manage members");
		}

		// Cannot remove the owner
		if (userId === workspace.ownerId) {
			throw new ForbiddenError("Cannot remove the workspace owner");
		}

		// Check if user is a member
		const targetMember = await workspaceRepository.getMember(
			workspaceId,
			userId,
		);
		if (!targetMember) {
			throw new NotFoundError("Workspace member", userId);
		}

		await workspaceRepository.removeMember(workspaceId, userId);

		await eventBus.emit(WORKSPACE_EVENTS.MEMBER_REMOVED, {
			workspaceId,
			userId,
			removedById: tenant.userId,
		});

		await auditService.log({
			action: "workspace.member_removed",
			resourceType: "workspace",
			resourceId: workspaceId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { removedUserId: userId },
		});
	}

	async updateMemberRole(
		workspaceId: string,
		userId: string,
		dto: UpdateMemberRoleDto,
	) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(workspaceId);

		if (!workspace) {
			throw new NotFoundError("Workspace", workspaceId);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		// Check user has permission to manage members
		const currentMember = await workspaceRepository.getMember(
			workspaceId,
			tenant.userId,
		);
		if (!currentMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		if (
			currentMember &&
			!canManageMembers(currentMember.role) &&
			!tenant.isOrganizationAdmin()
		) {
			throw new ForbiddenError("You do not have permission to manage members");
		}

		// Cannot change owner role
		if (userId === workspace.ownerId) {
			throw new ForbiddenError("Cannot change the workspace owner role");
		}

		// Check if user is a member
		const targetMember = await workspaceRepository.getMember(
			workspaceId,
			userId,
		);
		if (!targetMember) {
			throw new NotFoundError("Workspace member", userId);
		}

		const previousRole = targetMember.role;

		await workspaceRepository.updateMemberRole(
			workspaceId,
			userId,
			dto.role as WorkspaceRole,
		);

		await eventBus.emit(WORKSPACE_EVENTS.MEMBER_ROLE_CHANGED, {
			workspaceId,
			userId,
			previousRole,
			newRole: dto.role,
			changedById: tenant.userId,
		});

		await auditService.log({
			action: "workspace.member_removed", // Using existing action type
			resourceType: "workspace",
			resourceId: workspaceId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { targetUserId: userId, previousRole, newRole: dto.role },
		});
	}

	async listMembers(workspaceId: string) {
		const tenant = getCurrentTenant();
		const workspace = await workspaceRepository.findById(workspaceId);

		if (!workspace) {
			throw new NotFoundError("Workspace", workspaceId);
		}

		if (workspace.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this workspace");
		}

		const isMember = await workspaceRepository.isMember(
			workspaceId,
			tenant.userId,
		);
		if (!isMember && !tenant.isOrganizationAdmin()) {
			throw new ForbiddenError("You are not a member of this workspace");
		}

		return workspaceRepository.getMembers(workspaceId);
	}
}

export const workspaceService = new WorkspaceService();
