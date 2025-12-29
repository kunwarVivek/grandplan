// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

import { auth } from "@grandplan/auth";
import { UnauthorizedError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";

/**
 * Authentication middleware that validates the session using better-auth
 * Sets req.user with the authenticated user's information
 *
 * This middleware should be applied before tenantMiddleware
 */
export async function authMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		// Skip for public routes
		if (
			req.path.startsWith("/api/auth") ||
			req.path === "/" ||
			req.path === "/health" ||
			req.path === "/ready"
		) {
			next();
			return;
		}

		// Get the authorization header or cookie
		const authHeader = req.headers.authorization;
		const sessionCookie = req.cookies?.["better-auth.session_token"];

		if (!authHeader && !sessionCookie) {
			next(new UnauthorizedError("Authentication required"));
			return;
		}

		// Validate session with better-auth
		const session = await auth.api.getSession({
			headers: new Headers({
				authorization: authHeader ?? "",
				cookie: req.headers.cookie ?? "",
			}),
		});

		if (!session?.user) {
			next(new UnauthorizedError("Invalid or expired session"));
			return;
		}

		// Set user info on request
		req.user = {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
		};

		// Set headers for downstream middleware (tenant middleware)
		req.headers["x-user-id"] = session.user.id;

		next();
	} catch (_error) {
		// If better-auth throws, treat as unauthorized
		next(new UnauthorizedError("Authentication failed"));
	}
}

/**
 * Optional authentication middleware
 * Same as authMiddleware but doesn't fail if no auth is present
 * Useful for routes that work with or without authentication
 */
export async function optionalAuthMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const authHeader = req.headers.authorization;
		const sessionCookie = req.cookies?.["better-auth.session_token"];

		if (!authHeader && !sessionCookie) {
			next();
			return;
		}

		const session = await auth.api.getSession({
			headers: new Headers({
				authorization: authHeader ?? "",
				cookie: req.headers.cookie ?? "",
			}),
		});

		if (session?.user) {
			req.user = {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name,
			};
			req.headers["x-user-id"] = session.user.id;
		}

		next();
	} catch {
		// Silently continue without auth on error
		next();
	}
}
