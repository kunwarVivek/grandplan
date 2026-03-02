import prisma from "@grandplan/db";
import { env } from "@grandplan/env/server";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { type Auth as BetterAuthInstance, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";

import { polarClient } from "./lib/payments";

// Parse CORS origins (supports comma-separated list)
const trustedOrigins = env.CORS_ORIGIN.split(",").map((origin) =>
	origin.trim(),
);

// Configure Polar plugins - portal is always included, checkout only if product ID is provided
const checkoutPlugin = env.POLAR_PRODUCT_ID
	? [
			checkout({
				products: [
					{
						productId: env.POLAR_PRODUCT_ID,
						slug: "pro",
					},
				],
				successUrl:
					env.POLAR_SUCCESS_URL ?? `${env.BETTER_AUTH_URL}/checkout/success`,
				authenticatedUsersOnly: true,
			}),
		]
	: [];

// Use mutable type assertion to satisfy PolarPlugins requirement
const polarPlugins = [portal(), ...checkoutPlugin] as unknown as [
	ReturnType<typeof portal>,
	...ReturnType<typeof checkout>[],
];

// Create the auth instance with explicit type to avoid inference issues with Polar SDK types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: BetterAuthInstance = betterAuth({
	appName: "GrandPlan",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins,
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	plugins: [
		twoFactor({
			issuer: "GrandPlan",
		}),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			enableCustomerPortal: true,
			use: polarPlugins,
		}),
	],
}) as BetterAuthInstance;

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * The auth instance type - re-export from better-auth for typing auth-related parameters
 */
/**
 * Re-export core better-auth types for consumers
 */
export type { Auth, Session, User } from "better-auth";

/**
 * Authenticated user payload - minimal user info attached to requests
 * This is what gets set on Express req.user after authentication
 */
export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string | null;
}

/**
 * Session data with user information
 */
export interface SessionData {
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		token: string;
		createdAt: Date;
		updatedAt: Date;
		ipAddress?: string | null;
		userAgent?: string | null;
	};
	user: {
		id: string;
		email: string;
		emailVerified: boolean;
		name: string;
		createdAt: Date;
		updatedAt: Date;
		image?: string | null;
	};
}

/**
 * Session with user information - the full session object returned by getSession
 */
export type SessionWithUser = SessionData | null;

/**
 * Authentication result from getSession - can be session or null
 */
export type AuthResult = SessionWithUser;

// ============================================
// MIDDLEWARE HELPERS
// ============================================

/**
 * Re-export toNodeHandler for Express integration
 * Use this to create the auth route handler: app.all("/api/auth/*", toNodeHandler(auth))
 */
export { toNodeHandler } from "better-auth/node";

/**
 * Get session from request headers
 * @param headers - Headers object (Web API Headers or converted from Express)
 * @returns Session with user or null if not authenticated
 */
export async function getSession(headers: Headers): Promise<SessionWithUser> {
	const result = await auth.api.getSession({ headers });
	return result as SessionWithUser;
}

/**
 * Validate a session and return the user if valid
 * @param headers - Headers object with authorization/cookie
 * @returns The authenticated user or null
 */
export async function validateSession(
	headers: Headers,
): Promise<AuthenticatedUser | null> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) {
		return null;
	}
	return {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name,
	};
}

/**
 * Create Headers object from Node.js request headers
 * Useful for converting Express req.headers to Web API Headers
 * @param nodeHeaders - Headers from Express request (req.headers)
 * @returns Web API Headers object
 */
export function createHeadersFromNodeRequest(nodeHeaders: {
	authorization?: string;
	cookie?: string;
	[key: string]: string | string[] | undefined;
}): Headers {
	const headers = new Headers();
	if (nodeHeaders.authorization) {
		headers.set("authorization", nodeHeaders.authorization);
	}
	if (nodeHeaders.cookie) {
		headers.set(
			"cookie",
			Array.isArray(nodeHeaders.cookie)
				? nodeHeaders.cookie.join("; ")
				: nodeHeaders.cookie,
		);
	}
	return headers;
}

/**
 * Check if a session is valid without returning user data
 * @param headers - Headers object
 * @returns true if session is valid, false otherwise
 */
export async function isAuthenticated(headers: Headers): Promise<boolean> {
	const session = await auth.api.getSession({ headers });
	return session?.user != null;
}
