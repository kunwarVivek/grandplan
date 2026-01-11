// ============================================
// ORGANIZATION INVITATION SERVICE
// ============================================
// Handles organization invitation operations only (SRP)

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@grandplan/core/errors";
import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import type {
	AcceptInvitationDto,
	InviteMemberDto,
} from "../../api/dto/create-organization.dto.js";
import { isInvitationExpired } from "../../domain/entities/organization.entity.js";
import { ORGANIZATION_EVENTS } from "../../domain/events/organization.events.js";
import type {
	IInvitationRepository,
	IMemberRepository,
	InvitationQueryOptions,
	IOrganizationRepository,
} from "../../infrastructure/repositories/interfaces/index.js";
import { organizationRepository as orgRepo } from "../../infrastructure/repositories/organization.repository.js";

export class OrganizationInvitationService {
	private readonly invitationRepository: IInvitationRepository;
	private readonly memberRepository: IMemberRepository;
	private readonly orgRepository: IOrganizationRepository;

	constructor(
		invitationRepository?: IInvitationRepository,
		memberRepository?: IMemberRepository,
		organizationRepository?: IOrganizationRepository,
	) {
		this.invitationRepository = invitationRepository ?? orgRepo;
		this.memberRepository = memberRepository ?? orgRepo;
		this.orgRepository = organizationRepository ?? orgRepo;
	}

	async inviteMember(organizationId: string, dto: InviteMemberDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== organizationId &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await this.orgRepository.findById(organizationId);
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
			await this.invitationRepository.findInvitationByEmail(
				organizationId,
				dto.email,
			);
		if (existingInvitation) {
			throw new ConflictError(
				"An invitation has already been sent to this email",
			);
		}

		const invitation = await this.invitationRepository.createInvitation({
			organizationId,
			email: dto.email,
			roleId: dto.roleId,
			teamId: dto.teamId,
			invitedById: tenant.userId,
		});

		await eventBus.emit(ORGANIZATION_EVENTS.MEMBER_INVITED, {
			invitationId: invitation.id,
			organizationId,
			inviteeEmail: dto.email,
			role: dto.roleId,
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
		const invitation = await this.invitationRepository.findInvitationByToken(
			dto.token,
		);
		if (!invitation) {
			throw new NotFoundError("Invitation");
		}

		if (invitation.status !== "PENDING") {
			throw new ValidationError("This invitation is no longer valid", {});
		}

		if (isInvitationExpired(invitation)) {
			await this.invitationRepository.updateInvitationStatus(
				invitation.id,
				"EXPIRED",
			);
			throw new ValidationError("This invitation has expired", {});
		}

		// Check if user is already a member
		const existingMember = await this.memberRepository.getMember(
			invitation.organizationId,
			userId,
		);
		if (existingMember) {
			throw new ConflictError("You are already a member of this organization");
		}

		// Add member
		const member = await this.memberRepository.addMember({
			organizationId: invitation.organizationId,
			userId,
			roleId: invitation.roleId,
			invitedById: invitation.invitedById,
		});

		// Update invitation status
		await this.invitationRepository.updateInvitationStatus(
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
			role: invitation.roleId,
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

		const organization = await this.orgRepository.findById(organizationId);
		if (!organization) {
			throw new NotFoundError("Organization", organizationId);
		}

		return this.invitationRepository.getInvitations(organizationId, options);
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

		await this.invitationRepository.updateInvitationStatus(
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

export const organizationInvitationService =
	new OrganizationInvitationService();
