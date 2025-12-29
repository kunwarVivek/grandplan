import prisma from "@grandplan/db";
import { env } from "@grandplan/env/server";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { polarClient } from "./lib/payments";

// Parse CORS origins (supports comma-separated list)
const trustedOrigins = env.CORS_ORIGIN.split(",").map((origin) =>
	origin.trim(),
);

// Configure Polar checkout only if product ID is provided
const polarPlugins = [];
if (env.POLAR_PRODUCT_ID) {
	polarPlugins.push(
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
	);
}
polarPlugins.push(portal());

export const auth = betterAuth({
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
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			enableCustomerPortal: true,
			use: polarPlugins,
		}),
	],
});

// Export types for use in applications
export type Auth = typeof auth;
export type { Session, User } from "better-auth";

// Auth middleware helper for Express routes
export async function getSession(headers: Headers) {
	return auth.api.getSession({ headers });
}
