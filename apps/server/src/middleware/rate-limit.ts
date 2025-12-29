// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

import { RateLimitError } from "@grandplan/core/errors";
import { env } from "@grandplan/env/server";
import type { NextFunction, Request, Response } from "express";
import Redis from "ioredis";

// Redis client for rate limiting (lazy initialized)
let redis: Redis | null = null;

function getRedis(): Redis {
	if (!redis) {
		redis = new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 1,
			enableReadyCheck: false,
		});
	}
	return redis;
}

interface RateLimitConfig {
	windowMs: number; // Window size in milliseconds
	max: number; // Maximum requests per window
	keyPrefix?: string; // Prefix for Redis keys
	keyGenerator?: (req: Request) => string; // Custom key generator
	skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
}

/**
 * Create a rate limiting middleware using Redis sliding window
 */
export function rateLimit(config: RateLimitConfig) {
	const {
		windowMs,
		max,
		keyPrefix = "rl",
		keyGenerator = (req) => req.user?.id ?? req.ip ?? "anonymous",
		skip = () => false,
	} = config;

	const windowSec = Math.floor(windowMs / 1000);

	return async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		if (skip(req)) {
			next();
			return;
		}

		const key = `${keyPrefix}:${keyGenerator(req)}`;

		try {
			const client = getRedis();
			const now = Date.now();
			const windowStart = now - windowMs;

			// Use Redis transaction for atomic operations
			const multi = client.multi();

			// Remove old entries outside the window
			multi.zremrangebyscore(key, 0, windowStart);

			// Add current request
			multi.zadd(key, now, `${now}-${Math.random()}`);

			// Count requests in window
			multi.zcard(key);

			// Set expiry on the key
			multi.expire(key, windowSec + 1);

			const results = await multi.exec();
			const count = results?.[2]?.[1] as number;

			// Set rate limit headers
			res.setHeader("X-RateLimit-Limit", max);
			res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
			res.setHeader(
				"X-RateLimit-Reset",
				new Date(now + windowMs).toISOString(),
			);

			if (count > max) {
				res.setHeader("Retry-After", windowSec);
				next(new RateLimitError("Rate limit exceeded", windowSec));
				return;
			}

			next();
		} catch (error) {
			// If Redis fails, allow the request through (fail open)
			// Log the error for monitoring
			console.error("Rate limit error:", error);
			next();
		}
	};
}

// ============================================
// PRESET RATE LIMITERS
// ============================================

/**
 * Standard API rate limit (100 requests per minute)
 */
export const standardRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 100,
	keyPrefix: "rl:api",
});

/**
 * Auth rate limit (10 requests per minute)
 * More restrictive for login/signup to prevent brute force
 */
export const authRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	keyPrefix: "rl:auth",
	keyGenerator: (req) => req.ip ?? "anonymous",
});

/**
 * AI operations rate limit (10 requests per minute per user)
 * More restrictive due to cost
 */
export const aiRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	keyPrefix: "rl:ai",
});

/**
 * Webhook rate limit (1000 requests per minute per IP)
 * Higher limit for webhook endpoints
 */
export const webhookRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 1000,
	keyPrefix: "rl:webhook",
	keyGenerator: (req) => req.ip ?? "unknown",
});

/**
 * Organization-scoped rate limit
 * Limits requests per organization
 */
export function organizationRateLimit(maxPerMinute: number) {
	return rateLimit({
		windowMs: 60 * 1000,
		max: maxPerMinute,
		keyPrefix: "rl:org",
		keyGenerator: (req) =>
			(req.headers["x-organization-id"] as string) ?? "no-org",
	});
}

/**
 * Cleanup function for graceful shutdown
 */
export async function closeRateLimiter(): Promise<void> {
	if (redis) {
		await redis.quit();
		redis = null;
	}
}
