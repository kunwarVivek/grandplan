import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		// ============================================
		// CORE - Required for all environments
		// ============================================
		DATABASE_URL: z.string().min(1),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		// ============================================
		// REDIS - Required for queue, events, realtime
		// ============================================
		REDIS_URL: z.string().url(),

		// ============================================
		// AUTH - Better-auth configuration
		// ============================================
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		CORS_ORIGIN: z.string().min(1), // Can be comma-separated for multiple origins

		// ============================================
		// PAYMENTS - Polar & Stripe
		// ============================================
		POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
		POLAR_PRODUCT_ID: z.string().min(1).optional(),
		POLAR_SUCCESS_URL: z.string().url().optional(),
		POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
		STRIPE_SECRET_KEY: z.string().min(1).optional(),
		STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

		// ============================================
		// AI - Provider configuration
		// ============================================
		AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
		AI_MODEL: z.string().optional(),
		OPENAI_API_KEY: z.string().min(1).optional(),
		ANTHROPIC_API_KEY: z.string().min(1).optional(),

		// ============================================
		// NOTIFICATIONS - Email & Push
		// ============================================
		SENDGRID_API_KEY: z.string().min(1).optional(),
		EMAIL_FROM: z.string().email().default("noreply@grandplan.app"),
		VAPID_PUBLIC_KEY: z.string().min(1).optional(),
		VAPID_PRIVATE_KEY: z.string().min(1).optional(),
		VAPID_SUBJECT: z.string().email().optional(),

		// ============================================
		// INTEGRATIONS - OAuth credentials (optional)
		// ============================================
		SLACK_CLIENT_ID: z.string().min(1).optional(),
		SLACK_CLIENT_SECRET: z.string().min(1).optional(),
		GITHUB_CLIENT_ID: z.string().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

		// ============================================
		// OBSERVABILITY (optional)
		// ============================================
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
		SENTRY_DSN: z.string().url().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

// Helper utilities for environment checks
export const isProd = () => env.NODE_ENV === "production";
export const isDev = () => env.NODE_ENV === "development";
export const isTest = () => env.NODE_ENV === "test";
