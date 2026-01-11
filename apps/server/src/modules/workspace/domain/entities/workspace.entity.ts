// ============================================
// WORKSPACE ENTITY
// ============================================

import type { WorkspaceRole } from "@grandplan/db";

export interface WorkspaceEntity {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	organizationId: string;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkspaceMemberEntity {
	id: string;
	role: WorkspaceRole;
	workspaceId: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkspaceWithMembers extends WorkspaceEntity {
	members: Array<
		WorkspaceMemberEntity & {
			user: {
				id: string;
				name: string | null;
				email: string;
				image: string | null;
			};
		}
	>;
	owner: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
}

export interface WorkspaceSettings {
	defaultProjectView?: "list" | "board" | "timeline";
	aiEnabled?: boolean;
	autoAssignment?: boolean;
	notificationPreferences?: {
		taskCreated?: boolean;
		taskCompleted?: boolean;
		mentions?: boolean;
	};
}

export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export function canManageMembers(role: WorkspaceRole): boolean {
	return role === "OWNER" || role === "ADMIN";
}

export function canEditWorkspace(role: WorkspaceRole): boolean {
	return role === "OWNER" || role === "ADMIN";
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
	return role === "OWNER";
}

export function canCreateProjects(role: WorkspaceRole): boolean {
	return role !== "VIEWER";
}
