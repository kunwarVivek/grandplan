// ============================================
// RBAC MIDDLEWARE
// ============================================

import { ForbiddenError } from "@grandplan/core/errors";
import { tryGetCurrentTenant } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";

/**
 * Middleware factory to require a specific permission
 */
export function requirePermission(permission: string) {
	return (_req: Request, _res: Response, next: NextFunction): void => {
		const tenant = tryGetCurrentTenant();

		if (!tenant) {
			next(new ForbiddenError("No authentication context"));
			return;
		}

		if (!tenant.hasPermission(permission)) {
			next(new ForbiddenError(`Missing required permission: ${permission}`));
			return;
		}

		next();
	};
}

/**
 * Middleware factory to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
	return (_req: Request, _res: Response, next: NextFunction): void => {
		const tenant = tryGetCurrentTenant();

		if (!tenant) {
			next(new ForbiddenError("No authentication context"));
			return;
		}

		if (!tenant.hasAnyPermission(permissions)) {
			next(
				new ForbiddenError(
					`Missing required permissions: ${permissions.join(" OR ")}`,
				),
			);
			return;
		}

		next();
	};
}

/**
 * Middleware factory to require all of the specified permissions
 */
export function requireAllPermissions(permissions: string[]) {
	return (_req: Request, _res: Response, next: NextFunction): void => {
		const tenant = tryGetCurrentTenant();

		if (!tenant) {
			next(new ForbiddenError("No authentication context"));
			return;
		}

		if (!tenant.hasAllPermissions(permissions)) {
			const missing = permissions.filter((p) => !tenant.hasPermission(p));
			next(
				new ForbiddenError(
					`Missing required permissions: ${missing.join(", ")}`,
				),
			);
			return;
		}

		next();
	};
}

/**
 * Middleware to require organization admin role
 */
export function requireOrganizationAdmin() {
	return (_req: Request, _res: Response, next: NextFunction): void => {
		const tenant = tryGetCurrentTenant();

		if (!tenant) {
			next(new ForbiddenError("No authentication context"));
			return;
		}

		if (!tenant.isOrganizationAdmin()) {
			next(new ForbiddenError("Organization admin access required"));
			return;
		}

		next();
	};
}
