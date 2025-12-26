export type PlatformUser = {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	emailVerified: boolean;
	role: "user" | "admin" | "super_admin";
	status: "active" | "suspended" | "deleted";
	organizationCount: number;
	createdAt: Date;
	lastLoginAt?: Date | null;
};

export type PlatformOrganization = {
	id: string;
	name: string;
	slug: string;
	status: "pending" | "active" | "suspended" | "cancelled";
	memberCount: number;
	plan: string;
	createdAt: Date;
	owner: { id: string; name: string; email: string };
};

export type PlatformPlan = {
	id: string;
	name: string;
	tier: "free" | "starter" | "pro" | "enterprise";
	price: number;
	interval: "monthly" | "yearly";
	features: string[];
	limits: Record<string, number>;
	isActive: boolean;
	subscriberCount: number;
};

export type PlatformStats = {
	totalUsers: number;
	activeUsers: number;
	totalOrganizations: number;
	activeOrganizations: number;
	totalRevenue: number;
	monthlyRecurringRevenue: number;
	userGrowth: { date: string; count: number }[];
	revenueGrowth: { date: string; amount: number }[];
};

export type SystemHealth = {
	database: "healthy" | "degraded" | "down";
	redis: "healthy" | "degraded" | "down";
	queue: "healthy" | "degraded" | "down";
	storage: "healthy" | "degraded" | "down";
	uptime: number;
	version: string;
};

export type AuditLogEntry = {
	id: string;
	timestamp: Date;
	actor: {
		id: string;
		name: string;
		email: string;
		type: "user" | "system" | "api";
	};
	action: string;
	target: {
		type: "user" | "organization" | "plan" | "system";
		id: string;
		name: string;
	};
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
};

export type PlatformUsersFilters = {
	search?: string;
	role?: PlatformUser["role"];
	status?: PlatformUser["status"];
	page?: number;
	limit?: number;
};

export type PlatformOrganizationsFilters = {
	search?: string;
	status?: PlatformOrganization["status"];
	plan?: string;
	page?: number;
	limit?: number;
};

export type AuditLogsFilters = {
	actorId?: string;
	action?: string;
	targetType?: AuditLogEntry["target"]["type"];
	startDate?: Date;
	endDate?: Date;
	page?: number;
	limit?: number;
};

// Status config for visual display
export const USER_STATUS_CONFIG: Record<
	PlatformUser["status"],
	{ label: string; color: string }
> = {
	active: { label: "Active", color: "bg-emerald-500/10 text-emerald-500" },
	suspended: { label: "Suspended", color: "bg-amber-500/10 text-amber-500" },
	deleted: { label: "Deleted", color: "bg-red-500/10 text-red-500" },
};

export const USER_ROLE_CONFIG: Record<
	PlatformUser["role"],
	{ label: string; color: string }
> = {
	user: { label: "User", color: "bg-muted text-muted-foreground" },
	admin: { label: "Admin", color: "bg-blue-500/10 text-blue-500" },
	super_admin: { label: "Super Admin", color: "bg-purple-500/10 text-purple-500" },
};

export const ORG_STATUS_CONFIG: Record<
	PlatformOrganization["status"],
	{ label: string; color: string }
> = {
	pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500" },
	active: { label: "Active", color: "bg-emerald-500/10 text-emerald-500" },
	suspended: { label: "Suspended", color: "bg-red-500/10 text-red-500" },
	cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
};

export const PLAN_TIER_CONFIG: Record<
	PlatformPlan["tier"],
	{ label: string; color: string }
> = {
	free: { label: "Free", color: "bg-muted text-muted-foreground" },
	starter: { label: "Starter", color: "bg-blue-500/10 text-blue-500" },
	pro: { label: "Pro", color: "bg-purple-500/10 text-purple-500" },
	enterprise: { label: "Enterprise", color: "bg-amber-500/10 text-amber-500" },
};

export const HEALTH_STATUS_CONFIG: Record<
	SystemHealth["database"],
	{ label: string; color: string }
> = {
	healthy: { label: "Healthy", color: "bg-emerald-500/10 text-emerald-500" },
	degraded: { label: "Degraded", color: "bg-amber-500/10 text-amber-500" },
	down: { label: "Down", color: "bg-red-500/10 text-red-500" },
};
