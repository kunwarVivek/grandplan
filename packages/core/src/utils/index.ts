// ============================================
// SHARED UTILITIES
// ============================================

import { nanoid } from "nanoid";

// ID Generation
export function generateId(size = 21): string {
	return nanoid(size);
}

export function generateShortId(): string {
	return nanoid(10);
}

export function generateToken(): string {
	return nanoid(32);
}

// Slug generation
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// Retry utility
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		delayMs?: number;
		backoff?: "linear" | "exponential";
		onRetry?: (attempt: number, error: Error) => void;
	} = {},
): Promise<T> {
	const {
		maxAttempts = 3,
		delayMs = 1000,
		backoff = "exponential",
		onRetry,
	} = options;

	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxAttempts) {
				throw lastError;
			}

			onRetry?.(attempt, lastError);

			const delay =
				backoff === "exponential"
					? delayMs * 2 ** (attempt - 1)
					: delayMs * attempt;

			await sleep(delay);
		}
	}

	throw lastError;
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delayMs: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | undefined;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => fn(...args), delayMs);
	};
}

// Throttle
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limitMs: number,
): (...args: Parameters<T>) => void {
	let inThrottle = false;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limitMs);
		}
	};
}

// Object utilities
export function omit<T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	keys: K[],
): Omit<T, K> {
	const result = { ...obj };
	for (const key of keys) {
		delete result[key];
	}
	return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	keys: K[],
): Pick<T, K> {
	const result = {} as Pick<T, K>;
	for (const key of keys) {
		if (key in obj) {
			result[key] = obj[key];
		}
	}
	return result;
}

// Deep clone
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// Chunk array
export function chunk<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

// Unique array
export function unique<T>(array: T[]): T[] {
	return [...new Set(array)];
}

// Group by
export function groupBy<T, K extends string | number>(
	array: T[],
	keyFn: (item: T) => K,
): Record<K, T[]> {
	return array.reduce(
		(acc, item) => {
			const key = keyFn(item);
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(item);
			return acc;
		},
		{} as Record<K, T[]>,
	);
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

// Materialized path utilities for task hierarchy
export function buildMaterializedPath(
	parentPath: string | null,
	id: string,
): string {
	return parentPath ? `${parentPath}.${id}` : id;
}

export function getAncestorIds(path: string): string[] {
	const parts = path.split(".");
	return parts.slice(0, -1);
}

export function getDepthFromPath(path: string): number {
	return path.split(".").length - 1;
}

export function isDescendantOf(childPath: string, parentPath: string): boolean {
	return childPath.startsWith(`${parentPath}.`);
}

// Date utilities
export function isExpired(date: Date): boolean {
	return new Date() > date;
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function addHours(date: Date, hours: number): Date {
	const result = new Date(date);
	result.setHours(result.getHours() + hours);
	return result;
}

// Encryption placeholder (implement with proper crypto in production)
export function hashToken(token: string): string {
	// In production, use crypto.createHash('sha256').update(token).digest('hex')
	return token;
}
