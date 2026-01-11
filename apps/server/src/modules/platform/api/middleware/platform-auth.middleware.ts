// ============================================
// PLATFORM AUTH MIDDLEWARE
// ============================================

import { ForbiddenError, UnauthorizedError } from "@grandplan/core";
import { db } from "@grandplan/db";
import { getCurrentTenant } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";

export interface PlatformUser {
	id: string;
	email: string;
	name: string | null;
	role: "super_admin" | "admin" | "support";
	permissions: string[];
}

declare global {
	namespace Express {
		interface Request {
			platformUser?: PlatformUser;
		}
	}
}

/**
 * Platform admin roles and their permissions
 */
const PLATFORM_ROLES = {
	super_admin: [
		"platform:users:read",
		"platform:users:write",
		"platform:users:delete",
		"platform:users:impersonate",
		"platform:organizations:read",
		"platform:organizations:write",
		"platform:organizations:delete",
		"platform:analytics:read",
		"platform:analytics:export",
		"platform:system:read",
		"platform:system:write",
		"platform:announcements:read",
		"platform:announcements:write",
		"platform:feature-flags:read",
		"platform:feature-flags:write",
		"platform:plans:read",
		"platform:plans:write",
		"platform:plans:delete",
	],
	admin: [
		"platform:users:read",
		"platform:users:write",
		"platform:organizations:read",
		"platform:organizations:write",
		"platform:analytics:read",
		"platform:system:read",
		"platform:announcements:read",
		"platform:announcements:write",
		"platform:feature-flags:read",
		"platform:plans:read",
		"platform:plans:write",
	],
	support: [
		"platform:users:read",
		"platform:users:impersonate",
		"platform:organizations:read",
		"platform:analytics:read",
		"platform:announcements:read",
		"platform:plans:read",
	],
};

/**
 * Verify that the current user is a platform admin
 */
export async function requirePlatformAuth(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const tenant = getCurrentTenant();

		if (!tenant.userId) {
			throw new UnauthorizedError("Authentication required");
		}

		// Check if user is a platform admin
		const platformAdmin = await db.platformAdmin.findUnique({
			where: { userId: tenant.userId },
			include: {
				user: {
					select: { id: true, email: true, name: true },
				},
			},
		});

		if (!platformAdmin) {
			throw new ForbiddenError("Platform admin access required");
		}

		const role = platformAdmin.role as keyof typeof PLATFORM_ROLES;
		const permissions = PLATFORM_ROLES[role] ?? [];

		req.platformUser = {
			id: platformAdmin.user.id,
			email: platformAdmin.user.email,
			name: platformAdmin.user.name,
			role,
			permissions,
		};

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Require a specific permission
 */
export function requirePlatformPermission(permission: string) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			if (!req.platformUser) {
				throw new UnauthorizedError("Platform authentication required");
			}

			if (!req.platformUser.permissions.includes(permission)) {
				throw new ForbiddenError(`Permission denied: ${permission}`);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPlatformPermission(...permissions: string[]) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			if (!req.platformUser) {
				throw new UnauthorizedError("Platform authentication required");
			}

			const hasPermission = permissions.some((p) =>
				req.platformUser!.permissions.includes(p),
			);

			if (!hasPermission) {
				throw new ForbiddenError(
					`Permission denied: requires one of ${permissions.join(", ")}`,
				);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Require super admin role
 */
export function requireSuperAdmin(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	try {
		if (!req.platformUser) {
			throw new UnauthorizedError("Platform authentication required");
		}

		if (req.platformUser.role !== "super_admin") {
			throw new ForbiddenError("Super admin access required");
		}

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Log platform admin action for audit
 */
export async function logPlatformAction(
	req: Request,
	action: string,
	resourceType: string,
	resourceId: string | null,
	metadata?: Record<string, unknown>,
): Promise<void> {
	if (!req.platformUser) {
		return;
	}

	await db.auditLog.create({
		data: {
			userId: req.platformUser.id,
			action: `platform:${action}`,
			resourceType,
			resourceId,
			metadata: (metadata ?? {}) as object,
			description: `${action} on ${resourceType}${resourceId ? ` (${resourceId})` : ""}`,
		},
	});
}
