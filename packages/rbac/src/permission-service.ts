// ============================================
// PERMISSION SERVICE
// ============================================

import { ForbiddenError } from "@grandplan/core/errors";
import { getCurrentTenant } from "@grandplan/tenant";
import { PERMISSION_MAP } from "./permissions.js";
import type { AccessDecision, PermissionCheck } from "./types.js";

export class PermissionService {
	/**
	 * Check if the current user has a specific permission
	 */
	check(permission: string): AccessDecision {
		const tenant = getCurrentTenant();
		const hasPermission = tenant.hasPermission(permission);

		return {
			allowed: hasPermission,
			reason: hasPermission ? undefined : `Missing permission: ${permission}`,
			missingPermissions: hasPermission ? undefined : [permission],
		};
	}

	/**
	 * Check if the current user has any of the specified permissions
	 */
	checkAny(permissions: string[]): AccessDecision {
		const tenant = getCurrentTenant();
		const hasAny = tenant.hasAnyPermission(permissions);

		return {
			allowed: hasAny,
			reason: hasAny
				? undefined
				: `Missing all permissions: ${permissions.join(", ")}`,
			missingPermissions: hasAny
				? undefined
				: permissions.filter((p) => !tenant.hasPermission(p)),
		};
	}

	/**
	 * Check if the current user has all of the specified permissions
	 */
	checkAll(permissions: string[]): AccessDecision {
		const tenant = getCurrentTenant();
		const missing = permissions.filter((p) => !tenant.hasPermission(p));
		const hasAll = missing.length === 0;

		return {
			allowed: hasAll,
			reason: hasAll ? undefined : `Missing permissions: ${missing.join(", ")}`,
			missingPermissions: hasAll ? undefined : missing,
		};
	}

	/**
	 * Check permission and throw ForbiddenError if not allowed
	 */
	require(permission: string): void {
		const decision = this.check(permission);
		if (!decision.allowed) {
			throw new ForbiddenError(decision.reason);
		}
	}

	/**
	 * Require any of the specified permissions
	 */
	requireAny(permissions: string[]): void {
		const decision = this.checkAny(permissions);
		if (!decision.allowed) {
			throw new ForbiddenError(decision.reason);
		}
	}

	/**
	 * Require all of the specified permissions
	 */
	requireAll(permissions: string[]): void {
		const decision = this.checkAll(permissions);
		if (!decision.allowed) {
			throw new ForbiddenError(decision.reason);
		}
	}

	/**
	 * Check if a permission code is valid
	 */
	isValidPermission(permission: string): boolean {
		return PERMISSION_MAP.has(permission);
	}

	/**
	 * Get the current user's permissions
	 */
	getCurrentPermissions(): string[] {
		const tenant = getCurrentTenant();
		return tenant.permissions;
	}

	/**
	 * Check if user is organization admin
	 */
	isOrganizationAdmin(): boolean {
		const tenant = getCurrentTenant();
		return tenant.isOrganizationAdmin();
	}
}

// Singleton instance
export const permissionService = new PermissionService();
