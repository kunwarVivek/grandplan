/**
 * Environment Variable Type Helpers
 *
 * Type-safe utilities for working with environment variables
 * across different contexts (server, client, build-time).
 */

/**
 * Environment modes supported by the application
 */
export type NodeEnv = "development" | "production" | "test";

/**
 * Log levels for application logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Marks an environment variable as required
 */
export type RequiredEnv<T> = T;

/**
 * Marks an environment variable as optional with a default value
 */
export type OptionalEnv<T, D extends T = T> = T | D;

/**
 * Environment variable that should only be available on the server
 */
export type ServerOnlyEnv<T> = T & { readonly __serverOnly: unique symbol };

/**
 * Environment variable that can be exposed to the client
 */
export type PublicEnv<T> = T & { readonly __public: unique symbol };

/**
 * Build-time environment variable (replaced at compile time)
 */
export type BuildTimeEnv<T> = T & { readonly __buildTime: unique symbol };

/**
 * Base interface for environment variable definitions
 */
export interface EnvVarDefinition<T = string> {
	/** The environment variable value type */
	type: T;
	/** Whether the variable is required */
	required: boolean;
	/** Default value if not provided */
	default?: T;
	/** Description of the variable's purpose */
	description?: string;
	/** Whether this is server-only (not exposed to client) */
	serverOnly?: boolean;
	/** Validation function */
	validate?: (value: T) => boolean;
}

/**
 * Environment schema type helper
 * Maps environment variable names to their definitions
 */
export type EnvSchema<T extends Record<string, EnvVarDefinition>> = {
	[K in keyof T]: T[K]["required"] extends true
		? T[K]["type"]
		: T[K]["type"] | undefined;
};

/**
 * Extract required environment variables from a schema
 */
export type RequiredEnvVars<T extends Record<string, EnvVarDefinition>> = {
	[K in keyof T as T[K]["required"] extends true ? K : never]: T[K]["type"];
};

/**
 * Extract optional environment variables from a schema
 */
export type OptionalEnvVars<T extends Record<string, EnvVarDefinition>> = {
	[K in keyof T as T[K]["required"] extends false
		? K
		: never]?: T[K]["type"];
};

/**
 * Helper to create a typed environment variable definition
 */
export function defineEnvVar<T = string>(
	definition: EnvVarDefinition<T>
): EnvVarDefinition<T> {
	return definition;
}

/**
 * Common environment variable patterns
 */
export const envPatterns = {
	/** URL pattern (http:// or https://) */
	url: /^https?:\/\/.+$/,
	/** Email pattern */
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	/** UUID pattern */
	uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	/** Port number pattern */
	port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
	/** Boolean string pattern */
	boolean: /^(true|false|1|0|yes|no)$/i,
} as const;

/**
 * Parse a boolean environment variable
 *
 * @param value - String value to parse
 * @param defaultValue - Default if undefined
 * @returns Parsed boolean value
 */
export function parseEnvBoolean(
	value: string | undefined,
	defaultValue = false
): boolean {
	if (value === undefined) return defaultValue;
	const normalized = value.toLowerCase().trim();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Parse a numeric environment variable
 *
 * @param value - String value to parse
 * @param defaultValue - Default if undefined or invalid
 * @returns Parsed number value
 */
export function parseEnvNumber(
	value: string | undefined,
	defaultValue: number
): number {
	if (value === undefined) return defaultValue;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a comma-separated list environment variable
 *
 * @param value - String value to parse
 * @param defaultValue - Default if undefined
 * @returns Array of trimmed string values
 */
export function parseEnvList(
	value: string | undefined,
	defaultValue: string[] = []
): string[] {
	if (value === undefined || value.trim() === "") return defaultValue;
	return value.split(",").map((item) => item.trim());
}

/**
 * Parse a JSON environment variable
 *
 * @param value - JSON string to parse
 * @param defaultValue - Default if undefined or invalid
 * @returns Parsed JSON value
 */
export function parseEnvJson<T>(
	value: string | undefined,
	defaultValue: T
): T {
	if (value === undefined) return defaultValue;
	try {
		return JSON.parse(value) as T;
	} catch {
		return defaultValue;
	}
}

/**
 * Type guard to check if an environment variable is defined
 */
export function isEnvDefined<T>(value: T | undefined): value is T {
	return value !== undefined && value !== null && value !== "";
}

/**
 * Safely access an environment variable with type checking
 *
 * @param key - Environment variable key
 * @param env - Environment object (defaults to process.env)
 * @returns The environment variable value or undefined
 */
export function getEnv(
	key: string,
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return env[key];
}

/**
 * Get a required environment variable, throwing if not defined
 *
 * @param key - Environment variable key
 * @param env - Environment object (defaults to process.env)
 * @returns The environment variable value
 * @throws Error if the variable is not defined
 */
export function requireEnv(
	key: string,
	env: Record<string, string | undefined> = process.env
): string {
	const value = env[key];
	if (!isEnvDefined(value)) {
		throw new Error(`Required environment variable ${key} is not defined`);
	}
	return value;
}

/**
 * Environment context for runtime checks
 */
export interface EnvContext {
	/** Current Node environment */
	nodeEnv: NodeEnv;
	/** Whether running in production */
	isProduction: boolean;
	/** Whether running in development */
	isDevelopment: boolean;
	/** Whether running in test */
	isTest: boolean;
	/** Whether running on server (has process.env) */
	isServer: boolean;
	/** Whether running in browser */
	isBrowser: boolean;
}

/**
 * Create an environment context object
 *
 * @param nodeEnv - The NODE_ENV value
 * @returns Environment context object
 */
export function createEnvContext(
	nodeEnv: string = process.env.NODE_ENV ?? "development"
): EnvContext {
	const env = nodeEnv as NodeEnv;
	return {
		nodeEnv: env,
		isProduction: env === "production",
		isDevelopment: env === "development",
		isTest: env === "test",
		isServer: typeof process !== "undefined" && !!process.env,
		// Use globalThis to check for browser environment in a type-safe way
		isBrowser: typeof globalThis !== "undefined" && "document" in globalThis,
	};
}
