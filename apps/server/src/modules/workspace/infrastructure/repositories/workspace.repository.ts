// ============================================
// WORKSPACE REPOSITORY
// ============================================

import db from "@grandplan/db";
import type { Prisma, WorkspaceRole } from "@prisma/client";
import type {
	WorkspaceEntity,
	WorkspaceWithMembers,
} from "../../domain/entities/workspace.entity.js";

export interface WorkspaceQueryOptions {
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: "name" | "createdAt" | "updatedAt";
	sortOrder?: "asc" | "desc";
}

export interface WorkspaceQueryResult {
	workspaces: WorkspaceEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export class WorkspaceRepository {
	async create(data: {
		name: string;
		slug: string;
		description?: string | null;
		organizationId: string;
		ownerId: string;
	}): Promise<WorkspaceEntity> {
		const workspace = await db.workspace.create({
			data: {
				name: data.name,
				slug: data.slug,
				description: data.description,
				organizationId: data.organizationId,
				ownerId: data.ownerId,
				members: {
					create: {
						userId: data.ownerId,
						role: "OWNER",
					},
				},
			},
		});

		return workspace;
	}

	async findById(id: string): Promise<WorkspaceEntity | null> {
		return db.workspace.findUnique({
			where: { id },
		});
	}

	async findByIdWithMembers(id: string): Promise<WorkspaceWithMembers | null> {
		return db.workspace.findUnique({
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
					},
				},
				owner: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		}) as Promise<WorkspaceWithMembers | null>;
	}

	async findBySlugAndOrganization(
		slug: string,
		organizationId: string,
	): Promise<WorkspaceEntity | null> {
		return db.workspace.findUnique({
			where: {
				organizationId_slug: {
					organizationId,
					slug,
				},
			},
		});
	}

	async findByOrganization(
		organizationId: string,
		options: WorkspaceQueryOptions = {},
	): Promise<WorkspaceQueryResult> {
		const {
			page = 1,
			limit = 20,
			search,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.WorkspaceWhereInput = {
			organizationId,
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [workspaces, total] = await Promise.all([
			db.workspace.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.workspace.count({ where }),
		]);

		return {
			workspaces,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findByUser(
		userId: string,
		organizationId: string,
		options: WorkspaceQueryOptions = {},
	): Promise<WorkspaceQueryResult> {
		const {
			page = 1,
			limit = 20,
			search,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.WorkspaceWhereInput = {
			organizationId,
			members: {
				some: { userId },
			},
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [workspaces, total] = await Promise.all([
			db.workspace.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.workspace.count({ where }),
		]);

		return {
			workspaces,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async update(
		id: string,
		data: Partial<Pick<WorkspaceEntity, "name" | "slug" | "description">>,
	): Promise<WorkspaceEntity> {
		return db.workspace.update({
			where: { id },
			data,
		});
	}

	async delete(id: string): Promise<void> {
		await db.workspace.delete({
			where: { id },
		});
	}

	async addMember(
		workspaceId: string,
		userId: string,
		role: WorkspaceRole,
	): Promise<void> {
		await db.workspaceMember.create({
			data: {
				workspaceId,
				userId,
				role,
			},
		});
	}

	async removeMember(workspaceId: string, userId: string): Promise<void> {
		await db.workspaceMember.delete({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
		});
	}

	async updateMemberRole(
		workspaceId: string,
		userId: string,
		role: WorkspaceRole,
	): Promise<void> {
		await db.workspaceMember.update({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
			data: { role },
		});
	}

	async getMember(
		workspaceId: string,
		userId: string,
	): Promise<{ id: string; role: WorkspaceRole } | null> {
		return db.workspaceMember.findUnique({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
			select: {
				id: true,
				role: true,
			},
		});
	}

	async getMembers(workspaceId: string) {
		return db.workspaceMember.findMany({
			where: { workspaceId },
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
			orderBy: { createdAt: "asc" },
		});
	}

	async isMember(workspaceId: string, userId: string): Promise<boolean> {
		const member = await db.workspaceMember.findUnique({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
		});
		return !!member;
	}

	async slugExists(
		slug: string,
		organizationId: string,
		excludeId?: string,
	): Promise<boolean> {
		const workspace = await db.workspace.findFirst({
			where: {
				slug,
				organizationId,
				...(excludeId && { id: { not: excludeId } }),
			},
		});
		return !!workspace;
	}
}

export const workspaceRepository = new WorkspaceRepository();
