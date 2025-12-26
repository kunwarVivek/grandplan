// ============================================
// PROJECT REPOSITORY
// ============================================

import db from "@grandplan/db";
import type { Prisma, ProjectStatus } from "@prisma/client";
import type {
	ProjectEntity,
	ProjectWithTasks,
	ProjectWithWorkspace,
} from "../../domain/entities/project.entity.js";

export interface ProjectQueryOptions {
	page?: number;
	limit?: number;
	workspaceId?: string;
	status?: ProjectStatus;
	search?: string;
	sortBy?: "name" | "createdAt" | "updatedAt" | "status";
	sortOrder?: "asc" | "desc";
}

export interface ProjectQueryResult {
	projects: ProjectEntity[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export class ProjectRepository {
	async create(data: {
		name: string;
		description?: string | null;
		workspaceId: string;
		color?: string | null;
		icon?: string | null;
	}): Promise<ProjectEntity> {
		const project = await db.project.create({
			data: {
				name: data.name,
				description: data.description,
				workspaceId: data.workspaceId,
				color: data.color,
				icon: data.icon,
				status: "ACTIVE",
			},
		});

		return project;
	}

	async findById(id: string): Promise<ProjectEntity | null> {
		return db.project.findUnique({
			where: { id },
		});
	}

	async findByIdWithWorkspace(
		id: string,
	): Promise<ProjectWithWorkspace | null> {
		return db.project.findUnique({
			where: { id },
			include: {
				workspace: {
					select: {
						id: true,
						name: true,
						slug: true,
						organizationId: true,
					},
				},
			},
		}) as Promise<ProjectWithWorkspace | null>;
	}

	async findByIdWithTasks(id: string): Promise<ProjectWithTasks | null> {
		return db.project.findUnique({
			where: { id },
			include: {
				tasks: {
					select: {
						id: true,
						title: true,
						status: true,
						nodeType: true,
						depth: true,
					},
					orderBy: [{ depth: "asc" }, { position: "asc" }],
				},
				_count: {
					select: { tasks: true },
				},
			},
		}) as Promise<ProjectWithTasks | null>;
	}

	async findByWorkspace(
		workspaceId: string,
		options: Omit<ProjectQueryOptions, "workspaceId"> = {},
	): Promise<ProjectQueryResult> {
		const {
			page = 1,
			limit = 20,
			status,
			search,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.ProjectWhereInput = {
			workspaceId,
			...(status && { status }),
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [projects, total] = await Promise.all([
			db.project.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
			}),
			db.project.count({ where }),
		]);

		return {
			projects,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findByOrganization(
		organizationId: string,
		options: ProjectQueryOptions = {},
	): Promise<ProjectQueryResult> {
		const {
			page = 1,
			limit = 20,
			workspaceId,
			status,
			search,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = options;

		const skip = (page - 1) * limit;

		const where: Prisma.ProjectWhereInput = {
			workspace: {
				organizationId,
				...(workspaceId && { id: workspaceId }),
			},
			...(status && { status }),
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				],
			}),
		};

		const [projects, total] = await Promise.all([
			db.project.findMany({
				where,
				skip,
				take: limit,
				orderBy: { [sortBy]: sortOrder },
				include: {
					workspace: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			}),
			db.project.count({ where }),
		]);

		return {
			projects,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async update(
		id: string,
		data: Partial<
			Pick<ProjectEntity, "name" | "description" | "status" | "color" | "icon">
		>,
	): Promise<ProjectEntity> {
		return db.project.update({
			where: { id },
			data,
		});
	}

	async delete(id: string): Promise<void> {
		await db.project.delete({
			where: { id },
		});
	}

	async updateStatus(
		id: string,
		status: ProjectStatus,
	): Promise<ProjectEntity> {
		return db.project.update({
			where: { id },
			data: { status },
		});
	}

	// YJS Document operations
	async getYjsDocument(
		projectId: string,
	): Promise<{ id: string; state: Buffer } | null> {
		return db.yjsDocument.findUnique({
			where: { projectId },
			select: {
				id: true,
				state: true,
			},
		});
	}

	async upsertYjsDocument(projectId: string, state: Buffer): Promise<void> {
		await db.yjsDocument.upsert({
			where: { projectId },
			create: {
				projectId,
				state,
			},
			update: {
				state,
			},
		});
	}

	async deleteYjsDocument(projectId: string): Promise<void> {
		await db.yjsDocument.deleteMany({
			where: { projectId },
		});
	}

	async getProjectStats(projectId: string): Promise<{
		totalTasks: number;
		completedTasks: number;
		inProgressTasks: number;
		blockedTasks: number;
	}> {
		const [total, completed, inProgress, blocked] = await Promise.all([
			db.taskNode.count({ where: { projectId } }),
			db.taskNode.count({ where: { projectId, status: "COMPLETED" } }),
			db.taskNode.count({ where: { projectId, status: "IN_PROGRESS" } }),
			db.taskNode.count({ where: { projectId, status: "BLOCKED" } }),
		]);

		return {
			totalTasks: total,
			completedTasks: completed,
			inProgressTasks: inProgress,
			blockedTasks: blocked,
		};
	}
}

export const projectRepository = new ProjectRepository();
