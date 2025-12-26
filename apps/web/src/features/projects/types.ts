export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectVisibility = "public" | "private" | "team";

export type Project = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	status: ProjectStatus;
	visibility: ProjectVisibility;
	workspaceId: string;
	startDate?: Date | null;
	endDate?: Date | null;
	color?: string | null;
	icon?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ProjectMember = {
	id: string;
	userId: string;
	projectId: string;
	role: "lead" | "member" | "viewer";
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	createdAt: Date;
};

export type ProjectStats = {
	totalTasks: number;
	completedTasks: number;
	inProgressTasks: number;
	overdueTasks: number;
	completionPercentage: number;
};

export type CreateProjectInput = {
	name: string;
	slug?: string;
	description?: string;
	status?: ProjectStatus;
	visibility?: ProjectVisibility;
	workspaceId: string;
	startDate?: Date;
	endDate?: Date;
	color?: string;
	icon?: string;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "workspaceId">>;

export const PROJECT_STATUS_CONFIG: Record<
	ProjectStatus,
	{ label: string; color: string; description: string }
> = {
	planning: {
		label: "Planning",
		color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
		description: "Project is in the planning phase",
	},
	active: {
		label: "Active",
		color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
		description: "Project is actively being worked on",
	},
	on_hold: {
		label: "On Hold",
		color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
		description: "Project is temporarily paused",
	},
	completed: {
		label: "Completed",
		color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
		description: "Project has been completed",
	},
	cancelled: {
		label: "Cancelled",
		color: "bg-red-500/10 text-red-500 border-red-500/30",
		description: "Project has been cancelled",
	},
};

export const PROJECT_VISIBILITY_CONFIG: Record<
	ProjectVisibility,
	{ label: string; description: string }
> = {
	public: {
		label: "Public",
		description: "Visible to all organization members",
	},
	private: {
		label: "Private",
		description: "Only visible to project members",
	},
	team: {
		label: "Team",
		description: "Visible to team members only",
	},
};

export const PROJECT_COLORS = [
	{ name: "Gray", value: "#6b7280" },
	{ name: "Red", value: "#ef4444" },
	{ name: "Orange", value: "#f97316" },
	{ name: "Amber", value: "#f59e0b" },
	{ name: "Green", value: "#22c55e" },
	{ name: "Teal", value: "#14b8a6" },
	{ name: "Blue", value: "#3b82f6" },
	{ name: "Indigo", value: "#6366f1" },
	{ name: "Purple", value: "#a855f7" },
	{ name: "Pink", value: "#ec4899" },
];
