// ============================================
// TEAM REPOSITORY
// ============================================

import db from "@grandplan/db";
import type { Prisma } from "@grandplan/db";
import type {
	TeamEntity,
	TeamMemberEntity,
	TeamWithMembers,
} from "../../domain/entities/team.entity.js";
import type {
	ITeamMemberRepository,
	ITeamRepository,
	TeamMemberQueryOptions,
	TeamMemberQueryResult,
	TeamQueryOptions,
	TeamQueryResult,
} from "./interfaces/index.js";

// Re-export interfaces for backwards compatibility
export type {
	TeamMemberQueryOptions,
	TeamMemberQueryResult,
	TeamQueryOptions,
	TeamQueryResult,
} from "./interfaces/index.js";

export class TeamRepository
	implements ITeamRepository, ITeamMemberRepository
{
	async create(data: {
		name: string;
		description?: string | null;
		organizationId: string;
	}): Promise<TeamEntity> {
		return db.team.create({
			data: {
				name: data.name,
				description: data.description,
				organizationId: data.organizationId,
			},
		});
	}

	async findById(id: string): Promise<TeamEntity | null> {
		return db.team.findUnique({
			where: { id },
		});
	}

	async findByIdWithMembers(id: string): Promise<TeamWithMembers | null> {
		return db.team.findUnique({
			where: { id },
			include: {
				members: {
					include: {
						organizationMember: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
									},
								},
							},
						},
						teamRole: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
				_count: {
					select: { members: true },
				},
			},
		}) as Promise<TeamWithMembers | null>;
	}

	async findByOrganization(
		organizationId: string,
		options: TeamQueryOptions = {},
	): Promise<TeamQueryResult> {
		const {
			page = 1,
			limit = 20,
			search,
			sortBy = "name",
			sortOrder = "asc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.TeamWhereInput = {
			organizationId,
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [teams, total] = await Promise.all([
			db.team.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.team.count({ where }),
		]);

		return {
			teams,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findByUser(
		userId: string,
		organizationId: string,
	): Promise<TeamEntity[]> {
		return db.team.findMany({
			where: {
				organizationId,
				members: {
					some: {
						organizationMember: { userId },
					},
				},
			},
			orderBy: { name: "asc" },
		});
	}

	async update(
		id: string,
		data: Partial<Pick<TeamEntity, "name" | "description">>,
	): Promise<TeamEntity> {
		return db.team.update({
			where: { id },
			data,
		});
	}

	async delete(id: string): Promise<void> {
		await db.team.delete({
			where: { id },
		});
	}

	async nameExists(
		name: string,
		organizationId: string,
		excludeId?: string,
	): Promise<boolean> {
		const team = await db.team.findFirst({
			where: {
				name,
				organizationId,
				...(excludeId && { id: { not: excludeId } }),
			},
		});
		return !!team;
	}

	// Members
	async getMembers(
		teamId: string,
		options: TeamMemberQueryOptions = {},
	): Promise<TeamMemberQueryResult> {
		const { page = 1, limit = 20, search } = options;

		const skip = (page - 1) * limit;

		const where: Prisma.TeamMemberWhereInput = {
			teamId,
			...(search && {
				organizationMember: {
					user: {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{ email: { contains: search, mode: "insensitive" } },
						],
					},
				},
			}),
		};

		const [members, total] = await Promise.all([
			db.teamMember.findMany({
				where,
				skip,
				take: limit,
				include: {
					organizationMember: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
					teamRole: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { createdAt: "asc" },
			}),
			db.teamMember.count({ where }),
		]);

		return {
			members: members as TeamMemberQueryResult["members"],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async getMember(
		teamId: string,
		organizationMemberId: string,
	): Promise<TeamMemberEntity | null> {
		return db.teamMember.findUnique({
			where: {
				teamId_organizationMemberId: {
					teamId,
					organizationMemberId,
				},
			},
		});
	}

	async getMemberByUserId(
		teamId: string,
		userId: string,
	): Promise<TeamMemberEntity | null> {
		return db.teamMember.findFirst({
			where: {
				teamId,
				organizationMember: { userId },
			},
		});
	}

	async addMember(data: {
		teamId: string;
		organizationMemberId: string;
		teamRoleId?: string | null;
	}): Promise<TeamMemberEntity> {
		return db.teamMember.create({
			data: {
				teamId: data.teamId,
				organizationMemberId: data.organizationMemberId,
				teamRoleId: data.teamRoleId,
			},
		});
	}

	async updateMemberRole(
		teamId: string,
		organizationMemberId: string,
		teamRoleId: string | null,
	): Promise<void> {
		await db.teamMember.update({
			where: {
				teamId_organizationMemberId: {
					teamId,
					organizationMemberId,
				},
			},
			data: { teamRoleId },
		});
	}

	async removeMember(
		teamId: string,
		organizationMemberId: string,
	): Promise<void> {
		await db.teamMember.delete({
			where: {
				teamId_organizationMemberId: {
					teamId,
					organizationMemberId,
				},
			},
		});
	}

	async isMember(teamId: string, userId: string): Promise<boolean> {
		const member = await db.teamMember.findFirst({
			where: {
				teamId,
				organizationMember: { userId },
			},
		});
		return !!member;
	}

	async countMembers(teamId: string): Promise<number> {
		return db.teamMember.count({ where: { teamId } });
	}
}

export const teamRepository = new TeamRepository();
