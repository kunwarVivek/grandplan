// ============================================
// TENANT CONTEXT MIDDLEWARE
// ============================================

import { UnauthorizedError } from "@grandplan/core/errors";
import db from "@grandplan/db";
import { runWithTenant, type TenantContextData } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";

// Extend Express Request type
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				name?: string | null;
			};
			tenant?: TenantContextData;
		}
	}
}

/**
 * Middleware to extract and validate the authenticated user
 * and set up the tenant context for the request
 */
export async function tenantMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		// Skip for public routes
		if (req.path.startsWith("/api/auth") || req.path === "/") {
			next();
			return;
		}

		// Get user from session (set by better-auth)
		const userId = req.headers["x-user-id"] as string;
		const organizationId = req.headers["x-organization-id"] as string;

		if (!userId) {
			next(new UnauthorizedError("Authentication required"));
			return;
		}

		// Get user from database
		const user = await db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
			},
		});

		if (!user) {
			next(new UnauthorizedError("User not found"));
			return;
		}

		req.user = user;

		// If organization ID is provided, set up full tenant context
		if (organizationId) {
			const member = await db.organizationMember.findUnique({
				where: {
					userId_organizationId: {
						userId,
						organizationId,
					},
				},
				include: {
					role: {
						include: {
							permissions: {
								include: {
									permission: true,
								},
							},
						},
					},
					teamMemberships: {
						include: {
							teamRole: true,
						},
					},
				},
			});

			if (!member) {
				next(new UnauthorizedError("Not a member of this organization"));
				return;
			}

			if (member.status !== "ACTIVE") {
				next(new UnauthorizedError("Organization membership is not active"));
				return;
			}

			// Build permissions list
			const permissions = member.role.permissions.map(
				(rp) => rp.permission.code,
			);

			// Build team roles map
			const teamRoles: Record<string, string> = {};
			for (const tm of member.teamMemberships) {
				if (tm.teamRole) {
					teamRoles[tm.teamId] = tm.teamRole.name;
				}
			}

			const tenantData: TenantContextData = {
				userId: user.id,
				organizationId,
				permissions,
				role: member.role.name,
				organizationRole: member.role.name,
				teamRoles,
			};

			req.tenant = tenantData;

			// Run the rest of the request within the tenant context
			runWithTenant(tenantData, () => {
				next();
			});
		} else {
			// No organization context - limited access
			const tenantData: TenantContextData = {
				userId: user.id,
				organizationId: "",
				permissions: [],
				role: "USER",
			};

			req.tenant = tenantData;

			runWithTenant(tenantData, () => {
				next();
			});
		}
	} catch (error) {
		next(error);
	}
}

/**
 * Middleware to require an organization context
 */
export function requireOrganization(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	if (!req.tenant?.organizationId) {
		next(new UnauthorizedError("Organization context required"));
		return;
	}
	next();
}
