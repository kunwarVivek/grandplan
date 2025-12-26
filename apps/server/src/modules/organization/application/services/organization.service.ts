// ============================================
// ORGANIZATION SERVICE
// ============================================

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@grandplan/core/errors";
import { slugify } from "@grandplan/core/utils";
import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant, tryGetCurrentTenant } from "@grandplan/tenant";
import type { OrganizationStatus } from "@prisma/client";
import type {
	AcceptInvitationDto,
	CreateOrganizationDto,
	InviteMemberDto,
	UpdateMemberRoleDto,
} from "../../api/dto/create-organization.dto.js";
import type {
	UpdateBrandingDto,
	UpdateOrganizationDto,
} from "../../api/dto/update-organization.dto.js";
import { isInvitationExpired } from "../../domain/entities/organization.entity.js";
import { ORGANIZATION_EVENTS } from "../../domain/events/organization.events.js";
import {
	type InvitationQueryOptions,
	type MemberQueryOptions,
	type OrganizationQueryOptions,
	organizationRepository,
} from "../../infrastructure/repositories/organization.repository.js";

export class OrganizationService {
	async create(dto: CreateOrganizationDto, userId: string) {
		const slug = dto.slug || slugify(dto.name);

		// Check for duplicate slug
		const exists = await organizationRepository.slugExists(slug);
		if (exists) {
			throw new ConflictError(
				`Organization with slug '${slug}' already exists`,
			);
		}

		// Get or create owner role
		let ownerRole = await db.role.findFirst({
			where: { name: "OWNER", scope: "ORGANIZATION", isSystem: true },
		});

		if (!ownerRole) {
			ownerRole = await db.role.create({
				data: {
					name: "OWNER",
					description: "Organization owner with full access",
					scope: "ORGANIZATION",
					isSystem: true,
				},
			});
		}

		const organization = await organizationRepository.create({
			name: dto.name,
			slug,
			description: dto.description,
			logo: dto.logo,
			createdById: userId,
			initialRoleId: ownerRole.id,
		});

		await eventBus.emit(ORGANIZATION_EVENTS.CREATED, {
			organizationId: organization.id,
			name: organization.name,
			slug: organization.slug,
			createdById: userId,
			createdAt: organization.createdAt,
		});

		await auditService.log({
			action: "organization.created",
			resourceType: "organization",
			resourceId: organization.id,
			userId,
			organizationId: organization.id,
			metadata: { name: organization.name, slug: organization.slug },
		});

		return organization;
	}

	async findById(id: string) {
		const tenant = tryGetCurrentTenant();
		const organization = await organizationRepository.findByIdWithMembers(id);

		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// If there's a tenant context, verify access
		if (
			tenant &&
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		return organization;
	}

	async findBySlug(slug: string) {
		const organization = await organizationRepository.findBySlug(slug);
		if (!organization) {
			throw new NotFoundError("Organization");
		}
		return organization;
	}

	async list(options: OrganizationQueryOptions = {}) {
		const tenant = tryGetCurrentTenant();

		// Only platform admins can list all organizations
		if (!tenant?.hasPermission("platform:admin")) {
			throw new ForbiddenError("Only platform admins can list organizations");
		}

		return organizationRepository.findAll(options);
	}

	async update(id: string, dto: UpdateOrganizationDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// Check for slug conflict if updating slug
		if (dto.slug && dto.slug !== organization.slug) {
			const exists = await organizationRepository.slugExists(dto.slug, id);
			if (exists) {
				throw new ConflictError(
					`Organization with slug '${dto.slug}' already exists`,
				);
			}
		}

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		const trackableFields = [
			"name",
			"slug",
			"description",
			"logo",
			"status",
		] as const;
		for (const field of trackableFields) {
			if (dto[field] !== undefined && dto[field] !== organization[field]) {
				previousValues[field] = organization[field];
				changes[field] = dto[field];
			}
		}

		const updated = await organizationRepository.update(
			id,
			dto as Partial<{
				name: string;
				slug: string;
				description: string | null;
				logo: string | null;
				status: OrganizationStatus;
			}>,
		);

		if (Object.keys(changes).length > 0) {
			await eventBus.emit(ORGANIZATION_EVENTS.UPDATED, {
				organizationId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			if (changes.status) {
				await eventBus.emit(ORGANIZATION_EVENTS.STATUS_CHANGED, {
					organizationId: id,
					previousStatus: previousValues.status as string,
					newStatus: changes.status as string,
					changedById: tenant.userId,
				});
			}

			await auditService.log({
				action: "organization.updated",
				resourceType: "organization",
				resourceId: id,
				userId: tenant.userId,
				organizationId: id,
				metadata: { changes, previousValues },
			});
		}

		return updated;
	}

	async updateBranding(id: string, dto: UpdateBrandingDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// Check custom domain conflict
		if (dto.customDomain && dto.customDomain !== organization.customDomain) {
			const exists = await organizationRepository.customDomainExists(
				dto.customDomain,
				id,
			);
			if (exists) {
				throw new ConflictError(
					`Custom domain '${dto.customDomain}' is already in use`,
				);
			}
		}

		const brandingConfig = {
			primaryColor: dto.primaryColor,
			secondaryColor: dto.secondaryColor,
			fontFamily: dto.fontFamily,
			logo: dto.logo,
			favicon: dto.favicon,
		};

		const updated = await organizationRepository.updateBranding(
			id,
			brandingConfig,
			dto.customDomain,
		);

		await eventBus.emit(ORGANIZATION_EVENTS.BRANDING_UPDATED, {
			organizationId: id,
			changes: dto,
			updatedById: tenant.userId,
		});

		await auditService.log({
			action: "organization.branding_updated",
			resourceType: "organization",
			resourceId: id,
			userId: tenant.userId,
			organizationId: id,
			metadata: { branding: brandingConfig, customDomain: dto.customDomain },
		});

		return updated;
	}

	async delete(id: string) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		await organizationRepository.delete(id);

		await eventBus.emit(ORGANIZATION_EVENTS.DELETED, {
			organizationId: id,
			name: organization.name,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "organization.deleted",
			resourceType: "organization",
			resourceId: id,
			userId: tenant.userId,
			organizationId: id,
			metadata: { name: organization.name },
		});
	}

	// Members
	async listMembers(id: string, options: MemberQueryOptions = {}) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		return organizationRepository.getMembers(id, options);
	}

	async inviteMember(organizationId: string, dto: InviteMemberDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(organizationId);
		if (!organization) {
			throw new NotFoundError("Organization", organizationId);
		}

		// Check if role exists
		const role = await db.role.findUnique({ where: { id: dto.roleId } });
		if (!role) {
			throw new NotFoundError("Role", dto.roleId);
		}

		// Check if user is already a member
		const existingMember = await db.organizationMember.findFirst({
			where: {
				organizationId,
				user: { email: dto.email.toLowerCase() },
			},
		});
		if (existingMember) {
			throw new ConflictError("User is already a member of this organization");
		}

		// Check for existing pending invitation
		const existingInvitation =
			await organizationRepository.findInvitationByEmail(
				organizationId,
				dto.email,
			);
		if (existingInvitation) {
			throw new ConflictError(
				"An invitation has already been sent to this email",
			);
		}

		const invitation = await organizationRepository.createInvitation({
			organizationId,
			email: dto.email,
			roleId: dto.roleId,
			teamId: dto.teamId,
			invitedById: tenant.userId,
		});

		await eventBus.emit(ORGANIZATION_EVENTS.MEMBER_INVITED, {
			invitationId: invitation.id,
			organizationId,
			email: dto.email,
			roleId: dto.roleId,
			invitedById: tenant.userId,
		});

		await auditService.log({
			action: "member.invited",
			resourceType: "organization",
			resourceId: organizationId,
			userId: tenant.userId,
			organizationId,
			metadata: { email: dto.email, roleId: dto.roleId },
		});

		return invitation;
	}

	async acceptInvitation(dto: AcceptInvitationDto, userId: string) {
		const invitation = await organizationRepository.findInvitationByToken(
			dto.token,
		);
		if (!invitation) {
			throw new NotFoundError("Invitation");
		}

		if (invitation.status !== "PENDING") {
			throw new ValidationError("This invitation is no longer valid", {});
		}

		if (isInvitationExpired(invitation)) {
			await organizationRepository.updateInvitationStatus(
				invitation.id,
				"EXPIRED",
			);
			throw new ValidationError("This invitation has expired", {});
		}

		// Check if user is already a member
		const existingMember = await organizationRepository.getMember(
			invitation.organizationId,
			userId,
		);
		if (existingMember) {
			throw new ConflictError("You are already a member of this organization");
		}

		// Add member
		const member = await organizationRepository.addMember({
			organizationId: invitation.organizationId,
			userId,
			roleId: invitation.roleId,
			invitedById: invitation.invitedById,
		});

		// Update invitation status
		await organizationRepository.updateInvitationStatus(
			invitation.id,
			"ACCEPTED",
		);

		// Add to team if specified
		if (invitation.teamId) {
			await db.teamMember.create({
				data: {
					teamId: invitation.teamId,
					organizationMemberId: member.id,
				},
			});
		}

		await eventBus.emit(ORGANIZATION_EVENTS.MEMBER_JOINED, {
			organizationId: invitation.organizationId,
			userId,
			memberId: member.id,
			roleId: invitation.roleId,
			invitationId: invitation.id,
		});

		await auditService.log({
			action: "member.joined",
			resourceType: "organization",
			resourceId: invitation.organizationId,
			userId,
			organizationId: invitation.organizationId,
			metadata: { invitationId: invitation.id },
		});

		return member;
	}

	async updateMemberRole(
		organizationId: string,
		userId: string,
		dto: UpdateMemberRoleDto,
	) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const member = await organizationRepository.getMember(
			organizationId,
			userId,
		);
		if (!member) {
			throw new NotFoundError("Member");
		}

		// Cannot change own role (unless platform admin)
		if (userId === tenant.userId && !tenant.hasPermission("platform:admin")) {
			throw new ForbiddenError("Cannot change your own role");
		}

		const previousRoleId = member.roleId;
		await organizationRepository.updateMemberRole(
			organizationId,
			userId,
			dto.roleId,
		);

		await eventBus.emit(ORGANIZATION_EVENTS.MEMBER_ROLE_CHANGED, {
			organizationId,
			userId,
			memberId: member.id,
			previousRoleId,
			newRoleId: dto.roleId,
			changedById: tenant.userId,
		});

		await auditService.log({
			action: "member.role_changed",
			resourceType: "organization",
			resourceId: organizationId,
			userId: tenant.userId,
			organizationId,
			metadata: { targetUserId: userId, previousRoleId, newRoleId: dto.roleId },
		});
	}

	async removeMember(organizationId: string, userId: string) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const member = await organizationRepository.getMember(
			organizationId,
			userId,
		);
		if (!member) {
			throw new NotFoundError("Member");
		}

		// Cannot remove yourself (unless platform admin)
		if (userId === tenant.userId && !tenant.hasPermission("platform:admin")) {
			throw new ForbiddenError("Cannot remove yourself from the organization");
		}

		// Check if this is the last owner
		const memberWithRole = await db.organizationMember.findUnique({
			where: { userId_organizationId: { userId, organizationId } },
			include: { role: true },
		});

		if (memberWithRole?.role.name === "OWNER") {
			const ownerCount = await db.organizationMember.count({
				where: {
					organizationId,
					role: { name: "OWNER" },
				},
			});
			if (ownerCount <= 1) {
				throw new ForbiddenError(
					"Cannot remove the last owner of the organization",
				);
			}
		}

		await organizationRepository.removeMember(organizationId, userId);

		await eventBus.emit(ORGANIZATION_EVENTS.MEMBER_REMOVED, {
			organizationId,
			userId,
			memberId: member.id,
			removedById: tenant.userId,
		});

		await auditService.log({
			action: "member.removed",
			resourceType: "organization",
			resourceId: organizationId,
			userId: tenant.userId,
			organizationId,
			metadata: { removedUserId: userId },
		});
	}

	// Invitations
	async listInvitations(
		organizationId: string,
		options: InvitationQueryOptions = {},
	) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await organizationRepository.findById(organizationId);
		if (!organization) {
			throw new NotFoundError("Organization", organizationId);
		}

		return organizationRepository.getInvitations(organizationId, options);
	}

	async revokeInvitation(organizationId: string, invitationId: string) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const invitation = await db.organizationInvitation.findUnique({
			where: { id: invitationId },
		});

		if (!invitation || invitation.organizationId !== organizationId) {
			throw new NotFoundError("Invitation", invitationId);
		}

		if (invitation.status !== "PENDING") {
			throw new ValidationError("Can only revoke pending invitations", {});
		}

		await organizationRepository.updateInvitationStatus(
			invitationId,
			"REVOKED",
		);

		await eventBus.emit(ORGANIZATION_EVENTS.INVITATION_REVOKED, {
			invitationId,
			organizationId,
			email: invitation.email,
			revokedById: tenant.userId,
		});

		await auditService.log({
			action: "member.invited", // Using existing action
			resourceType: "organization",
			resourceId: organizationId,
			userId: tenant.userId,
			organizationId,
			metadata: { action: "revoked", email: invitation.email },
		});
	}
}

export const organizationService = new OrganizationService();
