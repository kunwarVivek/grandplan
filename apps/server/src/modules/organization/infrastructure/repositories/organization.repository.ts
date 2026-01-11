// ============================================
// ORGANIZATION REPOSITORY
// ============================================

import { addDays, generateToken } from "@grandplan/core/utils";
import db from "@grandplan/db";
import type { InvitationStatus, MemberStatus, Prisma } from "@grandplan/db";
import type {
	BrandingConfig,
	OrganizationEntity,
	OrganizationInvitationEntity,
	OrganizationMemberEntity,
	OrganizationWithMembers,
} from "../../domain/entities/organization.entity.js";
import type {
	IInvitationRepository,
	IMemberRepository,
	InvitationQueryOptions,
	InvitationQueryResult,
	IOrganizationRepository,
	MemberQueryOptions,
	MemberQueryResult,
	OrganizationQueryOptions,
	OrganizationQueryResult,
} from "./interfaces/index.js";

// Re-export interfaces for backwards compatibility
export type {
	InvitationQueryOptions,
	InvitationQueryResult,
	MemberQueryOptions,
	MemberQueryResult,
	OrganizationQueryOptions,
	OrganizationQueryResult,
} from "./interfaces/index.js";

export class OrganizationRepository
	implements IOrganizationRepository, IMemberRepository, IInvitationRepository
{
	async create(data: {
		name: string;
		slug: string;
		description?: string | null;
		logo?: string | null;
		createdById: string;
		initialRoleId: string;
	}): Promise<OrganizationEntity> {
		const organization = await db.organization.create({
			data: {
				name: data.name,
				slug: data.slug,
				description: data.description,
				logo: data.logo,
				status: "ACTIVE",
				members: {
					create: {
						userId: data.createdById,
						roleId: data.initialRoleId,
						status: "ACTIVE",
					},
				},
			},
		});

		return organization as OrganizationEntity;
	}

	async findById(id: string): Promise<OrganizationEntity | null> {
		return db.organization.findUnique({
			where: { id },
		}) as Promise<OrganizationEntity | null>;
	}

	async findByIdWithMembers(
		id: string,
	): Promise<OrganizationWithMembers | null> {
		return db.organization.findUnique({
			where: { id },
			include: {
				members: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
						role: {
							select: {
								id: true,
								name: true,
							},
						},
					},
					where: { status: "ACTIVE" },
				},
				_count: {
					select: {
						members: true,
						teams: true,
						workspaces: true,
					},
				},
			},
		}) as Promise<OrganizationWithMembers | null>;
	}

	async findBySlug(slug: string): Promise<OrganizationEntity | null> {
		return db.organization.findUnique({
			where: { slug },
		}) as Promise<OrganizationEntity | null>;
	}

	async findByCustomDomain(domain: string): Promise<OrganizationEntity | null> {
		return db.organization.findUnique({
			where: { customDomain: domain },
		}) as Promise<OrganizationEntity | null>;
	}

	async findAll(
		options: OrganizationQueryOptions = {},
	): Promise<OrganizationQueryResult> {
		const {
			page = 1,
			limit = 20,
			search,
			status,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.OrganizationWhereInput = {
			...(status && { status }),
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ slug: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [organizations, total] = await Promise.all([
			db.organization.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.organization.count({ where }),
		]);

		return {
			organizations: organizations as OrganizationEntity[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async update(
		id: string,
		data: Partial<
			Pick<
				OrganizationEntity,
				| "name"
				| "slug"
				| "description"
				| "logo"
				| "status"
				| "customDomain"
				| "brandingConfig"
			>
		>,
	): Promise<OrganizationEntity> {
		return db.organization.update({
			where: { id },
			data: data as Prisma.OrganizationUpdateInput,
		}) as Promise<OrganizationEntity>;
	}

	async updateBranding(
		id: string,
		brandingConfig: BrandingConfig,
		customDomain?: string | null,
	): Promise<OrganizationEntity> {
		return db.organization.update({
			where: { id },
			data: {
				brandingConfig: brandingConfig as Prisma.InputJsonValue,
				...(customDomain !== undefined && { customDomain }),
			},
		}) as Promise<OrganizationEntity>;
	}

	async delete(id: string): Promise<void> {
		await db.organization.delete({
			where: { id },
		});
	}

	async slugExists(slug: string, excludeId?: string): Promise<boolean> {
		const org = await db.organization.findFirst({
			where: {
				slug,
				...(excludeId && { id: { not: excludeId } }),
			},
		});
		return !!org;
	}

	async customDomainExists(
		domain: string,
		excludeId?: string,
	): Promise<boolean> {
		const org = await db.organization.findFirst({
			where: {
				customDomain: domain,
				...(excludeId && { id: { not: excludeId } }),
			},
		});
		return !!org;
	}

	// Members
	async getMembers(
		organizationId: string,
		options: MemberQueryOptions = {},
	): Promise<MemberQueryResult> {
		const { page = 1, limit = 20, search, status, roleId } = options;

		const skip = (page - 1) * limit;

		const where: Prisma.OrganizationMemberWhereInput = {
			organizationId,
			...(status && { status }),
			...(roleId && { roleId }),
			...(search && {
				user: {
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ email: { contains: search, mode: "insensitive" } },
					],
				},
			}),
		};

		const [members, total] = await Promise.all([
			db.organizationMember.findMany({
				where,
				skip,
				take: limit,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					role: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { joinedAt: "desc" },
			}),
			db.organizationMember.count({ where }),
		]);

		return {
			members: members as MemberQueryResult["members"],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async getMember(
		organizationId: string,
		userId: string,
	): Promise<OrganizationMemberEntity | null> {
		return db.organizationMember.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
		});
	}

	async addMember(data: {
		organizationId: string;
		userId: string;
		roleId: string;
		invitedById?: string;
	}): Promise<OrganizationMemberEntity> {
		return db.organizationMember.create({
			data: {
				organizationId: data.organizationId,
				userId: data.userId,
				roleId: data.roleId,
				invitedById: data.invitedById,
				status: "ACTIVE",
			},
		});
	}

	async updateMemberRole(
		organizationId: string,
		userId: string,
		roleId: string,
	): Promise<void> {
		await db.organizationMember.update({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
			data: { roleId },
		});
	}

	async updateMemberStatus(
		organizationId: string,
		userId: string,
		status: MemberStatus,
	): Promise<void> {
		await db.organizationMember.update({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
			data: { status },
		});
	}

	async removeMember(organizationId: string, userId: string): Promise<void> {
		await db.organizationMember.delete({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
		});
	}

	async countMembers(organizationId: string): Promise<number> {
		return db.organizationMember.count({
			where: { organizationId, status: "ACTIVE" },
		});
	}

	// Invitations
	async createInvitation(data: {
		organizationId: string;
		email: string;
		roleId: string;
		teamId?: string | null;
		invitedById: string;
		expiresInDays?: number;
	}): Promise<OrganizationInvitationEntity> {
		const token = generateToken();
		const expiresAt = addDays(new Date(), data.expiresInDays ?? 7);

		return db.organizationInvitation.create({
			data: {
				organizationId: data.organizationId,
				email: data.email.toLowerCase(),
				roleId: data.roleId,
				teamId: data.teamId,
				invitedById: data.invitedById,
				token,
				expiresAt,
				status: "PENDING",
			},
		});
	}

	async getInvitations(
		organizationId: string,
		options: InvitationQueryOptions = {},
	): Promise<InvitationQueryResult> {
		const { page = 1, limit = 20, status } = options;

		const skip = (page - 1) * limit;

		const where: Prisma.OrganizationInvitationWhereInput = {
			organizationId,
			...(status && { status }),
		};

		const [invitations, total] = await Promise.all([
			db.organizationInvitation.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
			db.organizationInvitation.count({ where }),
		]);

		return {
			invitations,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findInvitationByToken(
		token: string,
	): Promise<OrganizationInvitationEntity | null> {
		return db.organizationInvitation.findUnique({
			where: { token },
		});
	}

	async findInvitationByEmail(
		organizationId: string,
		email: string,
	): Promise<OrganizationInvitationEntity | null> {
		return db.organizationInvitation.findFirst({
			where: {
				organizationId,
				email: email.toLowerCase(),
				status: "PENDING",
			},
		});
	}

	async updateInvitationStatus(
		id: string,
		status: InvitationStatus,
	): Promise<void> {
		await db.organizationInvitation.update({
			where: { id },
			data: { status },
		});
	}

	async deleteInvitation(id: string): Promise<void> {
		await db.organizationInvitation.delete({
			where: { id },
		});
	}

	async expireOldInvitations(): Promise<number> {
		const result = await db.organizationInvitation.updateMany({
			where: {
				status: "PENDING",
				expiresAt: { lt: new Date() },
			},
			data: { status: "EXPIRED" },
		});
		return result.count;
	}
}

export const organizationRepository = new OrganizationRepository();
