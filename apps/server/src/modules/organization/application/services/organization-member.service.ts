// ============================================
// ORGANIZATION MEMBER SERVICE
// ============================================
// Handles organization membership operations only (SRP)

import { auditService } from "@grandplan/audit";
import { ForbiddenError, NotFoundError } from "@grandplan/core/errors";
import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import type { UpdateMemberRoleDto } from "../../api/dto/create-organization.dto.js";
import { ORGANIZATION_EVENTS } from "../../domain/events/organization.events.js";
import type {
	IMemberRepository,
	IOrganizationRepository,
	MemberQueryOptions,
} from "../../infrastructure/repositories/interfaces/index.js";
import { organizationRepository as orgRepo } from "../../infrastructure/repositories/organization.repository.js";

export class OrganizationMemberService {
	private readonly memberRepository: IMemberRepository;
	private readonly orgRepository: IOrganizationRepository;

	constructor(
		memberRepository?: IMemberRepository,
		organizationRepository?: IOrganizationRepository,
	) {
		this.memberRepository = memberRepository ?? orgRepo;
		this.orgRepository = organizationRepository ?? orgRepo;
	}

	async listMembers(organizationId: string, options: MemberQueryOptions = {}) {
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

		return this.memberRepository.getMembers(organizationId, options);
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

		const member = await this.memberRepository.getMember(
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
		await this.memberRepository.updateMemberRole(
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

		const member = await this.memberRepository.getMember(
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

		await this.memberRepository.removeMember(organizationId, userId);

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
}

export const organizationMemberService = new OrganizationMemberService();
