// ============================================
// DEFAULT ROLE DEFINITIONS
// ============================================

import type { Role } from "./types.js";

// Platform roles
export const PLATFORM_ROLES: Role[] = [
	{
		id: "platform:super_admin",
		name: "Super Admin",
		description: "Full platform access",
		scope: "PLATFORM",
		isSystem: true,
		permissions: [
			"platform:users:read",
			"platform:users:write",
			"platform:users:impersonate",
			"platform:orgs:read",
			"platform:orgs:write",
			"platform:subscriptions:read",
			"platform:subscriptions:write",
			"platform:plans:read",
			"platform:plans:write",
			"platform:system:read",
			"platform:system:write",
			"platform:analytics:read",
		],
	},
	{
		id: "platform:admin",
		name: "Admin",
		description: "Platform administration without system config",
		scope: "PLATFORM",
		isSystem: true,
		permissions: [
			"platform:users:read",
			"platform:users:write",
			"platform:orgs:read",
			"platform:orgs:write",
			"platform:subscriptions:read",
			"platform:subscriptions:write",
			"platform:plans:read",
			"platform:analytics:read",
		],
	},
	{
		id: "platform:support",
		name: "Support",
		description: "Customer support access",
		scope: "PLATFORM",
		isSystem: true,
		permissions: [
			"platform:users:read",
			"platform:orgs:read",
			"platform:subscriptions:read",
			"platform:analytics:read",
		],
	},
	{
		id: "platform:analyst",
		name: "Analyst",
		description: "Analytics only access",
		scope: "PLATFORM",
		isSystem: true,
		permissions: ["platform:analytics:read"],
	},
];

// Organization roles
export const ORGANIZATION_ROLES: Role[] = [
	{
		id: "org:owner",
		name: "Owner",
		description: "Full organization access",
		scope: "ORGANIZATION",
		isSystem: true,
		permissions: [
			"org:read",
			"org:write",
			"org:delete",
			"org:branding:write",
			"members:read",
			"members:invite",
			"members:remove",
			"members:roles",
			"teams:read",
			"teams:create",
			"teams:delete",
			"roles:read",
			"roles:write",
			"billing:read",
			"billing:manage",
			"audit:read",
			"integrations:read",
			"integrations:manage",
			"workspaces:create",
		],
	},
	{
		id: "org:admin",
		name: "Admin",
		description: "Organization administration",
		scope: "ORGANIZATION",
		isSystem: true,
		permissions: [
			"org:read",
			"org:write",
			"org:branding:write",
			"members:read",
			"members:invite",
			"members:remove",
			"members:roles",
			"teams:read",
			"teams:create",
			"teams:delete",
			"roles:read",
			"billing:read",
			"audit:read",
			"integrations:read",
			"integrations:manage",
			"workspaces:create",
		],
	},
	{
		id: "org:manager",
		name: "Manager",
		description: "Team and member management",
		scope: "ORGANIZATION",
		isSystem: true,
		permissions: [
			"org:read",
			"members:read",
			"members:invite",
			"teams:read",
			"teams:create",
			"integrations:read",
			"workspaces:create",
		],
	},
	{
		id: "org:member",
		name: "Member",
		description: "Standard member access",
		scope: "ORGANIZATION",
		isSystem: true,
		permissions: [
			"org:read",
			"members:read",
			"teams:read",
			"integrations:read",
		],
	},
	{
		id: "org:viewer",
		name: "Viewer",
		description: "Read-only access",
		scope: "ORGANIZATION",
		isSystem: true,
		permissions: ["org:read", "members:read", "teams:read"],
	},
];

// Workspace roles
export const WORKSPACE_ROLES: Role[] = [
	{
		id: "workspace:owner",
		name: "Owner",
		description: "Full workspace access",
		scope: "WORKSPACE",
		isSystem: true,
		permissions: [
			"workspace:read",
			"workspace:write",
			"workspace:delete",
			"workspace:members:manage",
			"projects:create",
			"projects:delete",
			"tasks:create",
			"tasks:edit",
			"tasks:delete",
			"tasks:assign",
			"tasks:ai",
			"ai:config",
			"comments:create",
			"comments:delete",
		],
	},
	{
		id: "workspace:admin",
		name: "Admin",
		description: "Workspace administration",
		scope: "WORKSPACE",
		isSystem: true,
		permissions: [
			"workspace:read",
			"workspace:write",
			"workspace:members:manage",
			"projects:create",
			"projects:delete",
			"tasks:create",
			"tasks:edit",
			"tasks:delete",
			"tasks:assign",
			"tasks:ai",
			"ai:config",
			"comments:create",
			"comments:delete",
		],
	},
	{
		id: "workspace:member",
		name: "Member",
		description: "Can create and edit tasks",
		scope: "WORKSPACE",
		isSystem: true,
		permissions: [
			"workspace:read",
			"projects:create",
			"tasks:create",
			"tasks:edit",
			"tasks:assign",
			"tasks:ai",
			"comments:create",
		],
	},
	{
		id: "workspace:viewer",
		name: "Viewer",
		description: "Read-only access",
		scope: "WORKSPACE",
		isSystem: true,
		permissions: ["workspace:read", "comments:create"],
	},
];

// Team roles
export const TEAM_ROLES: Role[] = [
	{
		id: "team:lead",
		name: "Team Lead",
		description: "Full team access",
		scope: "TEAM",
		isSystem: true,
		permissions: ["team:read", "team:write", "team:members:manage"],
	},
	{
		id: "team:member",
		name: "Member",
		description: "Standard team member",
		scope: "TEAM",
		isSystem: true,
		permissions: ["team:read"],
	},
	{
		id: "team:viewer",
		name: "Viewer",
		description: "Read-only team access",
		scope: "TEAM",
		isSystem: true,
		permissions: ["team:read"],
	},
];

// All roles
export const ALL_ROLES: Role[] = [
	...PLATFORM_ROLES,
	...ORGANIZATION_ROLES,
	...WORKSPACE_ROLES,
	...TEAM_ROLES,
];

// Role lookup
export const ROLE_MAP = new Map(ALL_ROLES.map((r) => [r.id, r]));

// Get permissions for a role
export function getRolePermissions(roleId: string): string[] {
	const role = ROLE_MAP.get(roleId);
	return role?.permissions ?? [];
}
