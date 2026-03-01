// ============================================
// TEAM SERVICE
// ============================================

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "@grandplan/core/errors";
import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import { organizationRepository } from "../../../organization/infrastructure/repositories/organization.repository.js";
import type {
	AddTeamMemberDto,
	CreateTeamDto,
	UpdateTeamMemberRoleDto,
} from "../../api/dto/create-team.dto.js";
import type { UpdateTeamDto } from "../../api/dto/update-team.dto.js";
import { TEAM_EVENTS } from "../../domain/events/team.events.js";
import {
	type TeamMemberQueryOptions,
	type TeamQueryOptions,
	teamRepository,
} from "../../infrastructure/repositories/team.repository.js";

export class TeamService {
	async create(dto: CreateTeamDto) {
		const tenant = getCurrentTenant();

		// Check for duplicate name
		const exists = await teamRepository.nameExists(
			dto.name,
			tenant.organizationId,
		);
		if (exists) {
			throw new ConflictError(`Team with name '${dto.name}' already exists`);
		}

		const team = await teamRepository.create({
			name: dto.name,
			description: dto.description,
			organizationId: tenant.organizationId,
		});

		await eventBus.emit(TEAM_EVENTS.CREATED, {
			teamId: team.id,
			name: team.name,
			workspaceId: "",
			organizationId: team.organizationId,
			createdById: tenant.userId,
			createdAt: team.createdAt,
		});

		await auditService.log({
			action: "team.created",
			resourceType: "team",
			resourceId: team.id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: team.name },
		});

		return team;
	}

	async findById(id: string) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findByIdWithMembers(id);

		if (!team) {
			throw new NotFoundError("Team", id);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		return team;
	}

	async list(options: TeamQueryOptions = {}) {
		const tenant = getCurrentTenant();
		return teamRepository.findByOrganization(tenant.organizationId, options);
	}

	async listUserTeams() {
		const tenant = getCurrentTenant();
		return teamRepository.findByUser(tenant.userId, tenant.organizationId);
	}

	async update(id: string, dto: UpdateTeamDto) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findById(id);

		if (!team) {
			throw new NotFoundError("Team", id);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		// Check for name conflict if updating name
		if (dto.name && dto.name !== team.name) {
			const exists = await teamRepository.nameExists(
				dto.name,
				tenant.organizationId,
				id,
			);
			if (exists) {
				throw new ConflictError(`Team with name '${dto.name}' already exists`);
			}
		}

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		if (dto.name !== undefined && dto.name !== team.name) {
			previousValues.name = team.name;
			changes.name = dto.name;
		}
		if (dto.description !== undefined && dto.description !== team.description) {
			previousValues.description = team.description;
			changes.description = dto.description;
		}

		const updated = await teamRepository.update(id, dto);

		if (Object.keys(changes).length > 0) {
			await eventBus.emit(TEAM_EVENTS.UPDATED, {
				teamId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			await auditService.log({
				action: "team.updated",
				resourceType: "team",
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
		const team = await teamRepository.findById(id);

		if (!team) {
			throw new NotFoundError("Team", id);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		await teamRepository.delete(id);

		await eventBus.emit(TEAM_EVENTS.DELETED, {
			teamId: id,
			name: team.name,
			workspaceId: "",
			organizationId: team.organizationId,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "team.deleted",
			resourceType: "team",
			resourceId: id,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { name: team.name },
		});
	}

	// Members
	async listMembers(teamId: string, options: TeamMemberQueryOptions = {}) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findById(teamId);

		if (!team) {
			throw new NotFoundError("Team", teamId);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		return teamRepository.getMembers(teamId, options);
	}

	async addMember(teamId: string, dto: AddTeamMemberDto) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findById(teamId);

		if (!team) {
			throw new NotFoundError("Team", teamId);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		// Get the organization member for the user
		const orgMember = await organizationRepository.getMember(
			tenant.organizationId,
			dto.userId,
		);
		if (!orgMember) {
			throw new NotFoundError("User is not a member of this organization");
		}

		// Check if already a team member
		const existingMember = await teamRepository.getMember(teamId, orgMember.id);
		if (existingMember) {
			throw new ConflictError("User is already a member of this team");
		}

		// Validate team role if provided
		if (dto.teamRoleId) {
			const role = await db.role.findFirst({
				where: { id: dto.teamRoleId, scope: "TEAM" },
			});
			if (!role) {
				throw new NotFoundError("Team role", dto.teamRoleId);
			}
		}

		const member = await teamRepository.addMember({
			teamId,
			organizationMemberId: orgMember.id,
			teamRoleId: dto.teamRoleId,
		});

		await eventBus.emit(TEAM_EVENTS.MEMBER_ADDED, {
			teamId,
			organizationMemberId: orgMember.id,
			userId: dto.userId,
			role: "",
			addedById: tenant.userId,
		});

		await auditService.log({
			action: "team.member_added",
			resourceType: "team",
			resourceId: teamId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { addedUserId: dto.userId, teamRoleId: dto.teamRoleId },
		});

		return member;
	}

	async updateMemberRole(
		teamId: string,
		userId: string,
		dto: UpdateTeamMemberRoleDto,
	) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findById(teamId);

		if (!team) {
			throw new NotFoundError("Team", teamId);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		// Get the organization member for the user
		const orgMember = await organizationRepository.getMember(
			tenant.organizationId,
			userId,
		);
		if (!orgMember) {
			throw new NotFoundError("User is not a member of this organization");
		}

		// Get team member
		const teamMember = await teamRepository.getMember(teamId, orgMember.id);
		if (!teamMember) {
			throw new NotFoundError("User is not a member of this team");
		}

		// Validate team role if provided
		if (dto.teamRoleId) {
			const role = await db.role.findFirst({
				where: { id: dto.teamRoleId, scope: "TEAM" },
			});
			if (!role) {
				throw new NotFoundError("Team role", dto.teamRoleId);
			}
		}

		const previousRoleId = teamMember.teamRoleId;
		await teamRepository.updateMemberRole(
			teamId,
			orgMember.id,
			dto.teamRoleId ?? null,
		);

		await eventBus.emit(TEAM_EVENTS.MEMBER_ROLE_CHANGED, {
			teamId,
			organizationMemberId: orgMember.id,
			userId,
			previousRole: previousRoleId ?? "",
			newRole: dto.teamRoleId ?? "",
			changedById: tenant.userId,
		});

		await auditService.log({
			action: "team.member_removed", // Using existing action type
			resourceType: "team",
			resourceId: teamId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: {
				targetUserId: userId,
				action: "roleChanged",
				previousRoleId,
				newRoleId: dto.teamRoleId,
			},
		});
	}

	async removeMember(teamId: string, userId: string) {
		const tenant = getCurrentTenant();
		const team = await teamRepository.findById(teamId);

		if (!team) {
			throw new NotFoundError("Team", teamId);
		}

		if (team.organizationId !== tenant.organizationId) {
			throw new ForbiddenError("Access denied to this team");
		}

		// Get the organization member for the user
		const orgMember = await organizationRepository.getMember(
			tenant.organizationId,
			userId,
		);
		if (!orgMember) {
			throw new NotFoundError("User is not a member of this organization");
		}

		// Get team member
		const teamMember = await teamRepository.getMember(teamId, orgMember.id);
		if (!teamMember) {
			throw new NotFoundError("User is not a member of this team");
		}

		await teamRepository.removeMember(teamId, orgMember.id);

		await eventBus.emit(TEAM_EVENTS.MEMBER_REMOVED, {
			teamId,
			organizationMemberId: orgMember.id,
			userId,
			removedById: tenant.userId,
		});

		await auditService.log({
			action: "team.member_removed",
			resourceType: "team",
			resourceId: teamId,
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			metadata: { removedUserId: userId },
		});
	}
}

export const teamService = new TeamService();
