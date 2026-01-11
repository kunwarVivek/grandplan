// ============================================
// PROJECT REPOSITORY INTERFACE
// ============================================

import type { ProjectStatus } from "@grandplan/db";
import type {
	ProjectEntity,
	ProjectWithTasks,
	ProjectWithWorkspace,
} from "../../../domain/entities/project.entity.js";

// ============================================
// Query Options
// ============================================

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

export interface ProjectStats {
	totalTasks: number;
	completedTasks: number;
	inProgressTasks: number;
	blockedTasks: number;
}

// ============================================
// Project Repository Interface
// ============================================

export interface IProjectRepository {
	// Project CRUD
	create(data: {
		name: string;
		description?: string | null;
		workspaceId: string;
		color?: string | null;
		icon?: string | null;
	}): Promise<ProjectEntity>;

	findById(id: string): Promise<ProjectEntity | null>;

	findByIdWithWorkspace(id: string): Promise<ProjectWithWorkspace | null>;

	findByIdWithTasks(id: string): Promise<ProjectWithTasks | null>;

	findByWorkspace(
		workspaceId: string,
		options?: Omit<ProjectQueryOptions, "workspaceId">,
	): Promise<ProjectQueryResult>;

	findByOrganization(
		organizationId: string,
		options?: ProjectQueryOptions,
	): Promise<ProjectQueryResult>;

	update(
		id: string,
		data: Partial<
			Pick<ProjectEntity, "name" | "description" | "status" | "color" | "icon">
		>,
	): Promise<ProjectEntity>;

	delete(id: string): Promise<void>;

	updateStatus(id: string, status: ProjectStatus): Promise<ProjectEntity>;

	getProjectStats(projectId: string): Promise<ProjectStats>;
}

// ============================================
// YJS Document Repository Interface
// ============================================

export interface IYjsDocumentRepository {
	getYjsDocument(
		projectId: string,
	): Promise<{ id: string; state: Buffer } | null>;

	upsertYjsDocument(projectId: string, state: Buffer): Promise<void>;

	deleteYjsDocument(projectId: string): Promise<void>;
}
