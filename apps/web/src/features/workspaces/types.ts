export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type Workspace = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
	organizationId: string;
	isDefault: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkspaceMember = {
	id: string;
	userId: string;
	workspaceId: string;
	role: WorkspaceRole;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	createdAt: Date;
};

export type CreateWorkspaceInput = {
	name: string;
	slug?: string;
	description?: string;
	icon?: string;
	color?: string;
	organizationId: string;
};

export type UpdateWorkspaceInput = Partial<
	Omit<CreateWorkspaceInput, "organizationId">
>;

export const WORKSPACE_ROLE_CONFIG: Record<
	WorkspaceRole,
	{ label: string; description: string }
> = {
	owner: {
		label: "Owner",
		description: "Full access to workspace settings and can delete workspace",
	},
	admin: {
		label: "Admin",
		description: "Can manage workspace members and settings",
	},
	member: {
		label: "Member",
		description: "Can create and edit projects and tasks",
	},
	viewer: {
		label: "Viewer",
		description: "Can view projects and tasks, but cannot edit",
	},
};

export const WORKSPACE_COLORS = [
	{ name: "Gray", value: "#6b7280" },
	{ name: "Red", value: "#ef4444" },
	{ name: "Orange", value: "#f97316" },
	{ name: "Amber", value: "#f59e0b" },
	{ name: "Yellow", value: "#eab308" },
	{ name: "Lime", value: "#84cc16" },
	{ name: "Green", value: "#22c55e" },
	{ name: "Emerald", value: "#10b981" },
	{ name: "Teal", value: "#14b8a6" },
	{ name: "Cyan", value: "#06b6d4" },
	{ name: "Sky", value: "#0ea5e9" },
	{ name: "Blue", value: "#3b82f6" },
	{ name: "Indigo", value: "#6366f1" },
	{ name: "Violet", value: "#8b5cf6" },
	{ name: "Purple", value: "#a855f7" },
	{ name: "Fuchsia", value: "#d946ef" },
	{ name: "Pink", value: "#ec4899" },
	{ name: "Rose", value: "#f43f5e" },
];
