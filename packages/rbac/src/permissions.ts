// ============================================
// PERMISSION DEFINITIONS
// ============================================

import type { Permission } from "./types.js";

// Platform permissions
export const PLATFORM_PERMISSIONS: Permission[] = [
	{
		code: "platform:users:read",
		name: "View Users",
		description: "View all platform users",
		category: "Users",
		scope: "PLATFORM",
	},
	{
		code: "platform:users:write",
		name: "Manage Users",
		description: "Create, update, delete users",
		category: "Users",
		scope: "PLATFORM",
	},
	{
		code: "platform:users:impersonate",
		name: "Impersonate Users",
		description: "Impersonate any user",
		category: "Users",
		scope: "PLATFORM",
	},
	{
		code: "platform:orgs:read",
		name: "View Organizations",
		description: "View all organizations",
		category: "Organizations",
		scope: "PLATFORM",
	},
	{
		code: "platform:orgs:write",
		name: "Manage Organizations",
		description: "Create, update, delete organizations",
		category: "Organizations",
		scope: "PLATFORM",
	},
	{
		code: "platform:subscriptions:read",
		name: "View Subscriptions",
		description: "View all subscriptions",
		category: "Billing",
		scope: "PLATFORM",
	},
	{
		code: "platform:subscriptions:write",
		name: "Manage Subscriptions",
		description: "Modify subscriptions",
		category: "Billing",
		scope: "PLATFORM",
	},
	{
		code: "platform:plans:read",
		name: "View Plans",
		description: "View subscription plans",
		category: "Billing",
		scope: "PLATFORM",
	},
	{
		code: "platform:plans:write",
		name: "Manage Plans",
		description: "Create, update plans",
		category: "Billing",
		scope: "PLATFORM",
	},
	{
		code: "platform:system:read",
		name: "View System Config",
		description: "View system configuration",
		category: "System",
		scope: "PLATFORM",
	},
	{
		code: "platform:system:write",
		name: "Manage System Config",
		description: "Modify system configuration",
		category: "System",
		scope: "PLATFORM",
	},
	{
		code: "platform:analytics:read",
		name: "View Analytics",
		description: "View platform analytics",
		category: "Analytics",
		scope: "PLATFORM",
	},
];

// Organization permissions
export const ORGANIZATION_PERMISSIONS: Permission[] = [
	{
		code: "org:read",
		name: "View Organization",
		description: "View organization details",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "org:write",
		name: "Manage Organization",
		description: "Update organization settings",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "org:delete",
		name: "Delete Organization",
		description: "Delete the organization",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "org:branding:write",
		name: "Manage Branding",
		description: "Update branding settings",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "members:read",
		name: "View Members",
		description: "View organization members",
		category: "Members",
		scope: "ORGANIZATION",
	},
	{
		code: "members:invite",
		name: "Invite Members",
		description: "Invite new members",
		category: "Members",
		scope: "ORGANIZATION",
	},
	{
		code: "members:remove",
		name: "Remove Members",
		description: "Remove members from organization",
		category: "Members",
		scope: "ORGANIZATION",
	},
	{
		code: "members:roles",
		name: "Manage Member Roles",
		description: "Change member roles",
		category: "Members",
		scope: "ORGANIZATION",
	},
	{
		code: "teams:read",
		name: "View Teams",
		description: "View all teams",
		category: "Teams",
		scope: "ORGANIZATION",
	},
	{
		code: "teams:create",
		name: "Create Teams",
		description: "Create new teams",
		category: "Teams",
		scope: "ORGANIZATION",
	},
	{
		code: "teams:delete",
		name: "Delete Teams",
		description: "Delete teams",
		category: "Teams",
		scope: "ORGANIZATION",
	},
	{
		code: "roles:read",
		name: "View Roles",
		description: "View custom roles",
		category: "Roles",
		scope: "ORGANIZATION",
	},
	{
		code: "roles:write",
		name: "Manage Roles",
		description: "Create and modify custom roles",
		category: "Roles",
		scope: "ORGANIZATION",
	},
	{
		code: "billing:read",
		name: "View Billing",
		description: "View subscription and invoices",
		category: "Billing",
		scope: "ORGANIZATION",
	},
	{
		code: "billing:manage",
		name: "Manage Billing",
		description: "Manage subscription and payment methods",
		category: "Billing",
		scope: "ORGANIZATION",
	},
	{
		code: "audit:read",
		name: "View Audit Logs",
		description: "View organization audit logs",
		category: "Audit",
		scope: "ORGANIZATION",
	},
	{
		code: "integrations:read",
		name: "View Integrations",
		description: "View integration settings",
		category: "Integrations",
		scope: "ORGANIZATION",
	},
	{
		code: "integrations:manage",
		name: "Manage Integrations",
		description: "Configure integrations",
		category: "Integrations",
		scope: "ORGANIZATION",
	},
	{
		code: "workspaces:create",
		name: "Create Workspaces",
		description: "Create new workspaces",
		category: "Workspaces",
		scope: "ORGANIZATION",
	},
];

// Workspace permissions
export const WORKSPACE_PERMISSIONS: Permission[] = [
	{
		code: "workspace:read",
		name: "View Workspace",
		description: "View workspace and projects",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "workspace:write",
		name: "Manage Workspace",
		description: "Update workspace settings",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "workspace:delete",
		name: "Delete Workspace",
		description: "Delete the workspace",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "workspace:members:manage",
		name: "Manage Members",
		description: "Add/remove workspace members",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "projects:create",
		name: "Create Projects",
		description: "Create new projects",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "projects:delete",
		name: "Delete Projects",
		description: "Delete projects",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:create",
		name: "Create Tasks",
		description: "Create new tasks",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:edit",
		name: "Edit Tasks",
		description: "Edit any task",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:delete",
		name: "Delete Tasks",
		description: "Delete tasks",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:assign",
		name: "Assign Tasks",
		description: "Assign tasks to members",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:ai",
		name: "Use AI Features",
		description: "Use AI decomposition and suggestions",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "ai:config",
		name: "Configure AI",
		description: "Configure workspace AI settings",
		category: "AI",
		scope: "WORKSPACE",
	},
	{
		code: "comments:create",
		name: "Create Comments",
		description: "Add comments to tasks",
		category: "Comments",
		scope: "WORKSPACE",
	},
	{
		code: "comments:delete",
		name: "Delete Comments",
		description: "Delete any comment",
		category: "Comments",
		scope: "WORKSPACE",
	},
];

// Team permissions
export const TEAM_PERMISSIONS: Permission[] = [
	{
		code: "team:read",
		name: "View Team",
		description: "View team details",
		category: "Team",
		scope: "TEAM",
	},
	{
		code: "team:write",
		name: "Manage Team",
		description: "Update team settings",
		category: "Team",
		scope: "TEAM",
	},
	{
		code: "team:members:manage",
		name: "Manage Team Members",
		description: "Add/remove team members",
		category: "Team",
		scope: "TEAM",
	},
];

// All permissions
export const ALL_PERMISSIONS: Permission[] = [
	...PLATFORM_PERMISSIONS,
	...ORGANIZATION_PERMISSIONS,
	...WORKSPACE_PERMISSIONS,
	...TEAM_PERMISSIONS,
];

// Permission lookup
export const PERMISSION_MAP = new Map(ALL_PERMISSIONS.map((p) => [p.code, p]));
