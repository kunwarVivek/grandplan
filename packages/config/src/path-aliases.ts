/**
 * Path Aliases Configuration Helper
 *
 * Utilities for generating and managing TypeScript path aliases
 * consistently across the monorepo.
 */

import type { CompilerOptions } from "typescript";

/**
 * Path alias entry configuration
 */
export interface PathAliasEntry {
	/** The alias pattern (e.g., "@app/*") */
	alias: string;
	/** The target path(s) relative to baseUrl */
	paths: string[];
}

/**
 * Path aliases configuration options
 */
export interface PathAliasesConfig {
	/** Base URL for path resolution (defaults to ".") */
	baseUrl?: string;
	/** Path alias entries */
	aliases: PathAliasEntry[];
}

/**
 * Common monorepo path alias presets
 */
export const pathAliasPresets = {
	/**
	 * Standard monorepo package aliases
	 */
	monorepo: {
		baseUrl: ".",
		aliases: [
			{ alias: "@grandplan/core", paths: ["../../packages/core/src"] },
			{ alias: "@grandplan/db", paths: ["../../packages/db/src"] },
			{ alias: "@grandplan/auth", paths: ["../../packages/auth/src"] },
			{ alias: "@grandplan/env", paths: ["../../packages/env/src"] },
			{ alias: "@grandplan/events", paths: ["../../packages/events/src"] },
			{ alias: "@grandplan/queue", paths: ["../../packages/queue/src"] },
			{
				alias: "@grandplan/notifications",
				paths: ["../../packages/notifications/src"],
			},
			{ alias: "@grandplan/realtime", paths: ["../../packages/realtime/src"] },
			{ alias: "@grandplan/rbac", paths: ["../../packages/rbac/src"] },
			{ alias: "@grandplan/tenant", paths: ["../../packages/tenant/src"] },
			{ alias: "@grandplan/ai", paths: ["../../packages/ai/src"] },
			{
				alias: "@grandplan/integrations",
				paths: ["../../packages/integrations/src"],
			},
			{ alias: "@grandplan/payments", paths: ["../../packages/payments/src"] },
			{ alias: "@grandplan/audit", paths: ["../../packages/audit/src"] },
		],
	},

	/**
	 * App-level source code aliases
	 */
	appSource: {
		baseUrl: ".",
		aliases: [
			{ alias: "@/*", paths: ["./src/*"] },
			{ alias: "@components/*", paths: ["./src/components/*"] },
			{ alias: "@features/*", paths: ["./src/features/*"] },
			{ alias: "@hooks/*", paths: ["./src/hooks/*"] },
			{ alias: "@utils/*", paths: ["./src/utils/*"] },
			{ alias: "@lib/*", paths: ["./src/lib/*"] },
			{ alias: "@modules/*", paths: ["./src/modules/*"] },
		],
	},
} as const;

/**
 * Convert PathAliasesConfig to TypeScript compilerOptions.paths format
 *
 * @param config - Path aliases configuration
 * @returns TypeScript paths configuration object
 *
 * @example
 * ```typescript
 * const paths = buildPathAliases({
 *   baseUrl: ".",
 *   aliases: [
 *     { alias: "@app/*", paths: ["./src/*"] },
 *     { alias: "@utils", paths: ["./src/utils/index.ts"] }
 *   ]
 * });
 * // Result: { "@app/*": ["./src/*"], "@utils": ["./src/utils/index.ts"] }
 * ```
 */
export function buildPathAliases(
	config: PathAliasesConfig
): CompilerOptions["paths"] {
	const paths: Record<string, string[]> = {};

	for (const entry of config.aliases) {
		paths[entry.alias] = entry.paths;
	}

	return paths;
}

/**
 * Merge multiple path alias configurations
 *
 * @param configs - Array of path alias configurations to merge
 * @returns Merged path aliases object
 *
 * @example
 * ```typescript
 * const merged = mergePathAliases(
 *   pathAliasPresets.monorepo,
 *   pathAliasPresets.appSource
 * );
 * ```
 */
export function mergePathAliases(
	...configs: PathAliasesConfig[]
): CompilerOptions["paths"] {
	const merged: Record<string, string[]> = {};

	for (const config of configs) {
		const paths = buildPathAliases(config);
		if (paths) {
			Object.assign(merged, paths);
		}
	}

	return merged;
}

/**
 * Create a path alias entry helper
 *
 * @param alias - The alias pattern
 * @param paths - Target path(s)
 * @returns PathAliasEntry object
 */
export function createAlias(
	alias: string,
	...paths: string[]
): PathAliasEntry {
	return { alias, paths };
}

/**
 * Generate path aliases for a package within the monorepo
 *
 * @param packageName - Package name without @grandplan/ prefix
 * @param relativePath - Relative path from consumer to package (defaults to standard monorepo layout)
 * @returns PathAliasEntry for the package
 */
export function packageAlias(
	packageName: string,
	relativePath?: string
): PathAliasEntry {
	const path = relativePath ?? `../../packages/${packageName}/src`;
	return {
		alias: `@grandplan/${packageName}`,
		paths: [path],
	};
}
