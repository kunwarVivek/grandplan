// ============================================
// PROJECT ENTITY
// ============================================

import type { ProjectStatus } from "@prisma/client";

export interface ProjectEntity {
	id: string;
	name: string;
	description: string | null;
	status: ProjectStatus;
	color: string | null;
	icon: string | null;
	workspaceId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProjectWithWorkspace extends ProjectEntity {
	workspace: {
		id: string;
		name: string;
		slug: string;
		organizationId: string;
	};
}

export interface ProjectWithTasks extends ProjectEntity {
	tasks: Array<{
		id: string;
		title: string;
		status: string;
		nodeType: string;
		depth: number;
	}>;
	_count: {
		tasks: number;
	};
}

export interface YjsDocumentEntity {
	id: string;
	projectId: string;
	state: Buffer;
	createdAt: Date;
	updatedAt: Date;
}

export const PROJECT_STATUSES = ["ACTIVE", "ARCHIVED", "COMPLETED"] as const;

export const DEFAULT_PROJECT_COLORS = [
	"#EF4444", // Red
	"#F97316", // Orange
	"#F59E0B", // Amber
	"#84CC16", // Lime
	"#22C55E", // Green
	"#06B6D4", // Cyan
	"#3B82F6", // Blue
	"#8B5CF6", // Violet
	"#EC4899", // Pink
	"#6B7280", // Gray
] as const;

export const PROJECT_ICONS = [
	"folder",
	"briefcase",
	"rocket",
	"star",
	"heart",
	"lightning",
	"flag",
	"target",
	"chart",
	"code",
] as const;

export function canArchiveProject(status: ProjectStatus): boolean {
	return status === "ACTIVE";
}

export function canActivateProject(status: ProjectStatus): boolean {
	return status === "ARCHIVED" || status === "COMPLETED";
}

export function canCompleteProject(status: ProjectStatus): boolean {
	return status === "ACTIVE";
}
