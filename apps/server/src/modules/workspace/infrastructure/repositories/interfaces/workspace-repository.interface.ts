// ============================================
// WORKSPACE REPOSITORY INTERFACE
// ============================================

import type { WorkspaceRole } from "@grandplan/db";
import type {
	WorkspaceEntity,
	WorkspaceWithMembers,
} from "../../../domain/entities/workspace.entity.js";

// ============================================
// Query Options
// ============================================

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

export interface WorkspaceMemberInfo {
	id: string;
	role: WorkspaceRole;
}

export interface WorkspaceMemberWithUser {
	id: string;
	role: WorkspaceRole;
	workspaceId: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
}

// ============================================
// Workspace Repository Interface
// ============================================

export interface IWorkspaceRepository {
	// Workspace CRUD
	create(data: {
		name: string;
		slug: string;
		description?: string | null;
		organizationId: string;
		ownerId: string;
	}): Promise<WorkspaceEntity>;

	findById(id: string): Promise<WorkspaceEntity | null>;

	findByIdWithMembers(id: string): Promise<WorkspaceWithMembers | null>;

	findBySlugAndOrganization(
		slug: string,
		organizationId: string,
	): Promise<WorkspaceEntity | null>;

	findByOrganization(
		organizationId: string,
		options?: WorkspaceQueryOptions,
	): Promise<WorkspaceQueryResult>;

	findByUser(
		userId: string,
		organizationId: string,
		options?: WorkspaceQueryOptions,
	): Promise<WorkspaceQueryResult>;

	update(
		id: string,
		data: Partial<Pick<WorkspaceEntity, "name" | "slug" | "description">>,
	): Promise<WorkspaceEntity>;

	delete(id: string): Promise<void>;

	slugExists(
		slug: string,
		organizationId: string,
		excludeId?: string,
	): Promise<boolean>;
}

// ============================================
// Workspace Member Repository Interface
// ============================================

export interface IWorkspaceMemberRepository {
	addMember(
		workspaceId: string,
		userId: string,
		role: WorkspaceRole,
	): Promise<void>;

	removeMember(workspaceId: string, userId: string): Promise<void>;

	updateMemberRole(
		workspaceId: string,
		userId: string,
		role: WorkspaceRole,
	): Promise<void>;

	getMember(
		workspaceId: string,
		userId: string,
	): Promise<WorkspaceMemberInfo | null>;

	getMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]>;

	isMember(workspaceId: string, userId: string): Promise<boolean>;
}
