// ============================================
// RBAC TYPE DEFINITIONS
// ============================================

export type PermissionScope =
	| "PLATFORM"
	| "ORGANIZATION"
	| "TEAM"
	| "WORKSPACE"
	| "USER";

export interface Permission {
	code: string;
	name: string;
	description: string;
	category: string;
	scope: PermissionScope;
}

export interface Role {
	id: string;
	name: string;
	description: string;
	scope: PermissionScope;
	isSystem: boolean;
	permissions: string[];
}

export interface PermissionCheck {
	permission: string;
	resourceType?: string;
	resourceId?: string;
}

export interface AccessDecision {
	allowed: boolean;
	reason?: string;
	missingPermissions?: string[];
}
