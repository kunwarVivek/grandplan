export type TeamRole = "lead" | "member";

export type Team = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	color?: string | null;
	icon?: string | null;
	organizationId: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TeamMember = {
	id: string;
	userId: string;
	teamId: string;
	role: TeamRole;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	createdAt: Date;
};

export type CreateTeamInput = {
	name: string;
	slug?: string;
	description?: string;
	color?: string;
	icon?: string;
	organizationId: string;
};

export type UpdateTeamInput = Partial<Omit<CreateTeamInput, "organizationId">>;

export const TEAM_ROLE_CONFIG: Record<
	TeamRole,
	{ label: string; description: string }
> = {
	lead: {
		label: "Team Lead",
		description: "Can manage team members and settings",
	},
	member: {
		label: "Member",
		description: "Regular team member",
	},
};

export const TEAM_COLORS = [
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
