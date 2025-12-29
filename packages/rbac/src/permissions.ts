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
		code: "organization:list",
		name: "List Organizations",
		description: "List user's organizations",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "organization:create",
		name: "Create Organization",
		description: "Create new organizations",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "organization:read",
		name: "View Organization",
		description: "View organization details",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "organization:update",
		name: "Update Organization",
		description: "Update organization settings",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "organization:delete",
		name: "Delete Organization",
		description: "Delete the organization",
		category: "Organization",
		scope: "ORGANIZATION",
	},
	{
		code: "organization:manage_members",
		name: "Manage Organization Members",
		description: "Invite, update roles, remove members",
		category: "Organization",
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
		code: "admin:read",
		name: "Admin Read Access",
		description: "View admin-only information like queue stats",
		category: "Admin",
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
		code: "workspace:create",
		name: "Create Workspace",
		description: "Create new workspaces",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "workspace:update",
		name: "Update Workspace",
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
		code: "workspace:manage_members",
		name: "Manage Workspace Members",
		description: "Add/remove workspace members",
		category: "Workspace",
		scope: "WORKSPACE",
	},
	{
		code: "project:read",
		name: "View Projects",
		description: "View projects in workspace",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "project:create",
		name: "Create Projects",
		description: "Create new projects",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "project:update",
		name: "Update Projects",
		description: "Update project settings",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "project:delete",
		name: "Delete Projects",
		description: "Delete projects",
		category: "Projects",
		scope: "WORKSPACE",
	},
	{
		code: "task:read",
		name: "View Tasks",
		description: "View tasks",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "task:create",
		name: "Create Tasks",
		description: "Create new tasks",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "task:update",
		name: "Update Tasks",
		description: "Update any task",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "task:delete",
		name: "Delete Tasks",
		description: "Delete tasks",
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
		code: "tasks:read",
		name: "View Tasks (alt)",
		description: "View tasks - alternate code for AI routes",
		category: "Tasks",
		scope: "WORKSPACE",
	},
	{
		code: "tasks:update",
		name: "Update Tasks (alt)",
		description: "Update tasks - alternate code for AI routes",
		category: "Tasks",
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
		code: "team:create",
		name: "Create Team",
		description: "Create new teams",
		category: "Team",
		scope: "TEAM",
	},
	{
		code: "team:update",
		name: "Update Team",
		description: "Update team settings",
		category: "Team",
		scope: "TEAM",
	},
	{
		code: "team:delete",
		name: "Delete Team",
		description: "Delete the team",
		category: "Team",
		scope: "TEAM",
	},
	{
		code: "team:manage_members",
		name: "Manage Team Members",
		description: "Add/remove team members",
		category: "Team",
		scope: "TEAM",
	},
];

// User-scoped permissions (applicable to any authenticated user for their own resources)
export const USER_PERMISSIONS: Permission[] = [
	{
		code: "notifications:read",
		name: "View Notifications",
		description: "View own notifications",
		category: "Notifications",
		scope: "USER",
	},
	{
		code: "notifications:manage",
		name: "Manage Notifications",
		description: "Mark notifications as read, archive, delete",
		category: "Notifications",
		scope: "USER",
	},
	{
		code: "notifications:preferences",
		name: "Manage Notification Preferences",
		description: "Configure notification preferences",
		category: "Notifications",
		scope: "USER",
	},
	{
		code: "notifications:push",
		name: "Manage Push Subscriptions",
		description: "Register and unregister push notification devices",
		category: "Notifications",
		scope: "USER",
	},
];

// All permissions
export const ALL_PERMISSIONS: Permission[] = [
	...PLATFORM_PERMISSIONS,
	...ORGANIZATION_PERMISSIONS,
	...WORKSPACE_PERMISSIONS,
	...TEAM_PERMISSIONS,
	...USER_PERMISSIONS,
];

// Permission lookup
export const PERMISSION_MAP = new Map(ALL_PERMISSIONS.map((p) => [p.code, p]));
