/**
 * Common TypeScript Utility Types
 *
 * Reusable utility types for consistent type patterns
 * across the monorepo. These complement TypeScript's built-in
 * utility types with domain-specific patterns.
 */

// ============================================
// OBJECT MANIPULATION TYPES
// ============================================

/**
 * Make specific properties optional
 *
 * @example
 * type User = { id: string; name: string; email: string };
 * type CreateUser = PartialBy<User, 'id'>;
 * // { id?: string; name: string; email: string }
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 *
 * @example
 * type User = { id?: string; name?: string };
 * type ValidUser = RequiredBy<User, 'id'>;
 * // { id: string; name?: string }
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;

/**
 * Make all properties nullable
 */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/**
 * Make specific properties nullable
 */
export type NullableBy<T, K extends keyof T> = Omit<T, K> & {
	[P in K]: T[P] | null;
};

/**
 * Remove null and undefined from all properties
 */
export type NonNullableProps<T> = {
	[P in keyof T]: NonNullable<T[P]>;
};

/**
 * Make all properties mutable (remove readonly)
 */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Deep mutable type
 */
export type DeepMutable<T> = T extends object
	? { -readonly [P in keyof T]: DeepMutable<T[P]> }
	: T;

/**
 * Pick properties by value type
 *
 * @example
 * type User = { id: string; age: number; active: boolean };
 * type StringProps = PickByType<User, string>;
 * // { id: string }
 */
export type PickByType<T, U> = {
	[P in keyof T as T[P] extends U ? P : never]: T[P];
};

/**
 * Omit properties by value type
 */
export type OmitByType<T, U> = {
	[P in keyof T as T[P] extends U ? never : P]: T[P];
};

/**
 * Get all keys with values assignable to type U
 */
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Merge two types, with the second type overriding the first
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Deep merge two types
 */
export type DeepMerge<T, U> = {
	[K in keyof T | keyof U]: K extends keyof U
		? K extends keyof T
			? T[K] extends object
				? U[K] extends object
					? DeepMerge<T[K], U[K]>
					: U[K]
				: U[K]
			: U[K]
		: K extends keyof T
			? T[K]
			: never;
};

// ============================================
// FUNCTION TYPES
// ============================================

/**
 * Extract parameter types from a function
 */
export type Parameters<T extends (...args: unknown[]) => unknown> =
	T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract return type from a function
 */
export type ReturnOf<T extends (...args: unknown[]) => unknown> =
	T extends (...args: unknown[]) => infer R ? R : never;

/**
 * Make a function async
 */
export type AsyncFunction<T extends (...args: unknown[]) => unknown> = (
	...args: Parameters<T>
) => Promise<ReturnOf<T>>;

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Deep awaited type for nested promises
 */
export type DeepAwaited<T> = T extends Promise<infer U>
	? DeepAwaited<U>
	: T extends object
		? { [K in keyof T]: DeepAwaited<T[K]> }
		: T;

/**
 * Constructor type
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Abstract constructor type
 */
export type AbstractConstructor<T = object> = abstract new (
	...args: unknown[]
) => T;

// ============================================
// ARRAY AND TUPLE TYPES
// ============================================

/**
 * Extract element type from array
 */
export type ArrayElement<T extends readonly unknown[]> =
	T extends readonly (infer U)[] ? U : never;

/**
 * Make an array readonly and extract element type
 */
export type ReadonlyArrayOf<T> = readonly T[];

/**
 * Tuple to union type
 *
 * @example
 * type Colors = TupleToUnion<['red', 'green', 'blue']>;
 * // 'red' | 'green' | 'blue'
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Check if array is non-empty
 */
export function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
	return arr.length > 0;
}

/**
 * First element of tuple/array
 */
export type Head<T extends readonly unknown[]> = T extends readonly [
	infer H,
	...unknown[],
]
	? H
	: never;

/**
 * All but first element of tuple
 */
export type Tail<T extends readonly unknown[]> = T extends readonly [
	unknown,
	...infer R,
]
	? R
	: never;

/**
 * Last element of tuple
 */
export type Last<T extends readonly unknown[]> = T extends readonly [
	...unknown[],
	infer L,
]
	? L
	: never;

// ============================================
// STRING LITERAL TYPES
// ============================================

/**
 * String literal type helpers
 */
export type Lowercase<S extends string> = S extends `${infer F}${infer R}`
	? `${Lowercase<F>}${Lowercase<R>}`
	: S;

/**
 * Uppercase string literal
 */
export type Uppercase<S extends string> = S extends `${infer F}${infer R}`
	? `${Uppercase<F>}${Uppercase<R>}`
	: S;

/**
 * CamelCase to kebab-case conversion
 *
 * @example
 * type Result = KebabCase<'camelCase'>;
 * // 'camel-case'
 */
export type KebabCase<S extends string> = S extends `${infer C}${infer R}`
	? C extends Lowercase<C>
		? `${C}${KebabCase<R>}`
		: `-${Lowercase<C>}${KebabCase<R>}`
	: S;

/**
 * String template type for prefixed keys
 *
 * @example
 * type PrefixedKeys = Prefixed<'user' | 'admin', 'role:'>;
 * // 'role:user' | 'role:admin'
 */
export type Prefixed<T extends string, P extends string> = `${P}${T}`;

/**
 * String template type for suffixed keys
 */
export type Suffixed<T extends string, S extends string> = `${T}${S}`;

// ============================================
// UNION AND INTERSECTION TYPES
// ============================================

/**
 * Exclude null and undefined from union
 */
export type Defined<T> = Exclude<T, null | undefined>;

/**
 * Convert union to intersection
 *
 * @example
 * type Result = UnionToIntersection<{ a: 1 } | { b: 2 }>;
 * // { a: 1 } & { b: 2 }
 */
export type UnionToIntersection<U> = (
	U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

/**
 * Get all possible keys from union of objects
 */
export type AllKeys<T> = T extends unknown ? keyof T : never;

/**
 * Get common keys from union of objects
 */
export type CommonKeys<T> = keyof UnionToIntersection<T>;

/**
 * Check if two types are exactly equal
 */
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
	T,
>() => T extends Y ? 1 : 2
	? true
	: false;

// ============================================
// BRANDED TYPES
// ============================================

/**
 * Create a branded/nominal type
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type OrderId = Brand<string, 'OrderId'>;
 *
 * const userId: UserId = 'user-123' as UserId;
 * const orderId: OrderId = userId; // Error!
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Common branded types for the application
 */
export type UUID = Brand<string, "UUID">;
export type Email = Brand<string, "Email">;
export type URL = Brand<string, "URL">;
export type Timestamp = Brand<number, "Timestamp">;
export type PositiveNumber = Brand<number, "PositiveNumber">;

/**
 * Remove brand from a type
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

// ============================================
// CONDITIONAL TYPES
// ============================================

/**
 * If-then-else type
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Check if type is any
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Check if type is never
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if type is unknown
 */
export type IsUnknown<T> = IsAny<T> extends true
	? false
	: unknown extends T
		? true
		: false;

/**
 * Strict property check - ensures no extra properties
 */
export type Exact<T, U extends T> = T & {
	[K in Exclude<keyof U, keyof T>]: never;
};

// ============================================
// RECORD AND MAP TYPES
// ============================================

/**
 * Strongly typed Object.keys
 */
export type ObjectKeys<T> = (keyof T)[];

/**
 * Strongly typed Object.entries
 */
export type ObjectEntries<T> = [keyof T, T[keyof T]][];

/**
 * Create a dictionary type with string keys
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Create an index signature with specific key type
 */
export type IndexSignature<K extends string | number | symbol, V> = {
	[key in K]: V;
};

/**
 * Value of a record type
 */
export type ValueOf<T> = T[keyof T];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Type-safe Object.keys
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe Object.entries
 */
export function typedEntries<T extends object>(
	obj: T
): [keyof T, T[keyof T]][] {
	return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Type-safe Object.fromEntries
 */
export function typedFromEntries<K extends string, V>(
	entries: [K, V][]
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Exhaustive check for switch statements
 *
 * @example
 * type Status = 'active' | 'inactive';
 * function handleStatus(status: Status) {
 *   switch (status) {
 *     case 'active': return 1;
 *     case 'inactive': return 0;
 *     default: return exhaustive(status);
 *   }
 * }
 */
export function exhaustive(value: never): never {
	throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

/**
 * Assert a value is defined (not null or undefined)
 */
export function assertDefined<T>(
	value: T | null | undefined,
	message?: string
): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message ?? "Value is not defined");
	}
}

/**
 * Type guard for checking if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
	return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Type guard for checking if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === "function";
}
