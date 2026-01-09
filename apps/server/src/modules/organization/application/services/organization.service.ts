// ============================================
// ORGANIZATION SERVICE (FACADE)
// ============================================
// This service acts as a facade for backwards compatibility.
// It delegates to focused services that follow SRP.
// New code should prefer importing the specific services directly.

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
import type {
	InvitationQueryOptions,
	MemberQueryOptions,
	OrganizationQueryOptions,
} from "../../infrastructure/repositories/interfaces/index.js";
import { organizationCoreService } from "./organization-core.service.js";
import { organizationInvitationService } from "./organization-invitation.service.js";
import { organizationMemberService } from "./organization-member.service.js";

/**
 * OrganizationService - Facade for backwards compatibility
 *
 * This class delegates to three focused services:
 * - OrganizationCoreService: Organization CRUD operations
 * - OrganizationMemberService: Membership management
 * - OrganizationInvitationService: Invitation handling
 *
 * For new code, prefer importing the specific services directly:
 * - import { organizationCoreService } from './organization-core.service.js'
 * - import { organizationMemberService } from './organization-member.service.js'
 * - import { organizationInvitationService } from './organization-invitation.service.js'
 */
export class OrganizationService {
	// ============================================
	// Organization CRUD (delegated to OrganizationCoreService)
	// ============================================

	async create(dto: CreateOrganizationDto, userId: string) {
		return organizationCoreService.create(dto, userId);
	}

	async findById(id: string) {
		return organizationCoreService.findById(id);
	}

	async findBySlug(slug: string) {
		return organizationCoreService.findBySlug(slug);
	}

	async list(options: OrganizationQueryOptions = {}) {
		return organizationCoreService.list(options);
	}

	async update(id: string, dto: UpdateOrganizationDto) {
		return organizationCoreService.update(id, dto);
	}

	async updateBranding(id: string, dto: UpdateBrandingDto) {
		return organizationCoreService.updateBranding(id, dto);
	}

	async delete(id: string) {
		return organizationCoreService.delete(id);
	}

	// ============================================
	// Members (delegated to OrganizationMemberService)
	// ============================================

	async listMembers(id: string, options: MemberQueryOptions = {}) {
		return organizationMemberService.listMembers(id, options);
	}

	async updateMemberRole(
		organizationId: string,
		userId: string,
		dto: UpdateMemberRoleDto,
	) {
		return organizationMemberService.updateMemberRole(
			organizationId,
			userId,
			dto,
		);
	}

	async removeMember(organizationId: string, userId: string) {
		return organizationMemberService.removeMember(organizationId, userId);
	}

	// ============================================
	// Invitations (delegated to OrganizationInvitationService)
	// ============================================

	async inviteMember(organizationId: string, dto: InviteMemberDto) {
		return organizationInvitationService.inviteMember(organizationId, dto);
	}

	async acceptInvitation(dto: AcceptInvitationDto, userId: string) {
		return organizationInvitationService.acceptInvitation(dto, userId);
	}

	async listInvitations(
		organizationId: string,
		options: InvitationQueryOptions = {},
	) {
		return organizationInvitationService.listInvitations(
			organizationId,
			options,
		);
	}

	async revokeInvitation(organizationId: string, invitationId: string) {
		return organizationInvitationService.revokeInvitation(
			organizationId,
			invitationId,
		);
	}
}

export const organizationService = new OrganizationService();
