// ============================================
// TENANT CONTEXT - AsyncLocalStorage for multi-tenancy
// ============================================

import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantContextData } from "./types.js";

// AsyncLocalStorage for tenant context propagation
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export class TenantContext {
	constructor(private readonly data: TenantContextData) {}

	get userId(): string {
		return this.data.userId;
	}

	get organizationId(): string {
		return this.data.organizationId;
	}

	get workspaceId(): string | undefined {
		return this.data.workspaceId;
	}

	get permissions(): string[] {
		return this.data.permissions;
	}

	get role(): string {
		return this.data.role;
	}

	get organizationRole(): string | undefined {
		return this.data.organizationRole;
	}

	hasPermission(permission: string): boolean {
		return this.data.permissions.includes(permission);
	}

	hasAnyPermission(permissions: string[]): boolean {
		return permissions.some((p) => this.data.permissions.includes(p));
	}

	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((p) => this.data.permissions.includes(p));
	}

	getTeamRole(teamId: string): string | undefined {
		return this.data.teamRoles?.[teamId];
	}

	isOrganizationAdmin(): boolean {
		return (
			this.data.organizationRole === "OWNER" ||
			this.data.organizationRole === "ADMIN"
		);
	}

	toJSON(): TenantContextData {
		return { ...this.data };
	}
}

/**
 * Run a function within a tenant context
 */
export function runWithTenant<T>(context: TenantContextData, fn: () => T): T {
	const tenantContext = new TenantContext(context);
	return tenantStorage.run(tenantContext, fn);
}

/**
 * Get the current tenant context
 * @throws Error if called outside of a tenant context
 */
export function getCurrentTenant(): TenantContext {
	const context = tenantStorage.getStore();
	if (!context) {
		throw new Error(
			"No tenant context available. Ensure the request is within a tenant context.",
		);
	}
	return context;
}

/**
 * Try to get the current tenant context, returns undefined if not available
 */
export function tryGetCurrentTenant(): TenantContext | undefined {
	return tenantStorage.getStore();
}
