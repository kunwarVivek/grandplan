/**
 * Config Validation Types
 *
 * Type helpers for validating configuration objects at compile-time
 * and runtime, ensuring type safety across the monorepo.
 *
 * This module provides a type-safe validation system that can be used
 * to validate configuration at application startup, ensuring all required
 * values are present and correctly formatted before the application runs.
 *
 * @example
 * ```typescript
 * import { ValidationResult, ValidationError, validateRequired, validateString } from '@grandplan/config';
 *
 * interface DatabaseConfig {
 *   host: string;
 *   port: number;
 *   database: string;
 * }
 *
 * function validateDatabaseConfig(config: unknown): ValidationResult<DatabaseConfig> {
 *   const errors: ValidationError[] = [];
 *
 *   const hostResult = validateString(config.host, 'database.host');
 *   if (!hostResult.valid) errors.push(...hostResult.errors);
 *
 *   // ... more validations
 *
 *   if (errors.length > 0) return { valid: false, errors };
 *   return { valid: true, data: config as DatabaseConfig };
 * }
 * ```
 */

/**
 * Discriminated union type representing the result of a validation operation.
 *
 * ValidationResult follows the "Result" pattern, providing a type-safe way to
 * handle validation outcomes without throwing exceptions. When `valid` is true,
 * the `data` property contains the validated value. When `valid` is false,
 * the `errors` property contains an array of validation errors.
 *
 * @typeParam T - The type of the validated data when validation succeeds
 *
 * @example
 * ```typescript
 * function processConfig(result: ValidationResult<AppConfig>) {
 *   if (result.valid) {
 *     // TypeScript knows result.data is AppConfig
 *     startServer(result.data);
 *   } else {
 *     // TypeScript knows result.errors is ValidationError[]
 *     result.errors.forEach(err =>
 *       console.error(`${err.path}: ${err.message}`)
 *     );
 *     process.exit(1);
 *   }
 * }
 * ```
 */
export type ValidationResult<T> =
	| { valid: true; data: T }
	| { valid: false; errors: ValidationError[] };

/**
 * Represents a single validation error with context about what failed.
 *
 * ValidationError provides structured information about validation failures,
 * including the path to the invalid field, an error message, and optional
 * metadata. This structure enables:
 * - Clear error reporting to users
 * - Programmatic error handling via error codes
 * - Field-specific error display in UIs
 *
 * @example
 * ```typescript
 * // Creating a validation error
 * const error: ValidationError = {
 *   path: 'database.port',
 *   message: 'Port must be a number between 1 and 65535',
 *   value: 'invalid',
 *   code: 'INVALID_PORT'
 * };
 *
 * // Using in validation logic
 * function validatePort(value: unknown, path: string): ValidationResult<number> {
 *   if (typeof value !== 'number') {
 *     return {
 *       valid: false,
 *       errors: [{
 *         path,
 *         message: `${path} must be a number`,
 *         value,
 *         code: 'TYPE_NUMBER'
 *       }]
 *     };
 *   }
 *   return { valid: true, data: value };
 * }
 *
 * // Displaying errors to users
 * errors.forEach(err => {
 *   console.error(`Error at ${err.path}: ${err.message}`);
 *   if (err.code) {
 *     // Handle specific error codes programmatically
 *     logMetric('validation_error', { code: err.code });
 *   }
 * });
 * ```
 */
export interface ValidationError {
	/**
	 * Dot-notation path to the invalid field.
	 * Uses dot notation for nested objects and bracket notation for array indices.
	 * @example "database.host", "servers[0].port", "auth.providers[1].clientId"
	 */
	path: string;

	/**
	 * Human-readable error message describing what validation failed.
	 * Should be clear enough to help users understand how to fix the issue.
	 */
	message: string;

	/**
	 * The actual value that failed validation.
	 * Only included when safe to expose (not for sensitive fields like passwords).
	 * Useful for debugging and logging.
	 */
	value?: unknown;

	/**
	 * Machine-readable error code for programmatic handling.
	 * Enables clients to handle specific errors differently or show localized messages.
	 * @example "REQUIRED", "TYPE_STRING", "MIN_LENGTH", "PATTERN", "INVALID_EMAIL"
	 */
	code?: string;
}

/**
 * Validator function type
 */
export type Validator<T> = (value: unknown) => ValidationResult<T>;

/**
 * Schema definition for config validation
 */
export type ConfigSchema<T> = {
	[K in keyof T]: FieldSchema<T[K]>;
};

/**
 * Field schema definition
 */
export interface FieldSchema<T> {
	/** Type validator */
	type: "string" | "number" | "boolean" | "object" | "array";
	/** Whether the field is required */
	required?: boolean;
	/** Default value */
	default?: T;
	/** Custom validation function */
	validate?: (value: T) => boolean | string;
	/** Nested schema for objects */
	schema?: T extends Record<string, unknown> ? ConfigSchema<T> : never;
	/** Item schema for arrays */
	items?: T extends (infer U)[] ? FieldSchema<U> : never;
}

/**
 * Type-safe configuration builder result
 */
export type ConfigBuilderResult<T> = Readonly<T> & {
	/** Validate the configuration */
	validate(): ValidationResult<T>;
	/** Get raw configuration object */
	toObject(): T;
};

/**
 * Deep partial type for configuration overrides
 */
export type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

/**
 * Deep required type for ensuring all fields are defined
 */
export type DeepRequired<T> = T extends object
	? { [P in keyof T]-?: DeepRequired<T[P]> }
	: T;

/**
 * Deep readonly type for immutable configurations
 */
export type DeepReadonly<T> = T extends object
	? { readonly [P in keyof T]: DeepReadonly<T[P]> }
	: T;

/**
 * Config with defaults type helper
 * Makes optional fields required after applying defaults
 */
export type WithDefaults<T, D extends DeepPartial<T>> = {
	[K in keyof T]: K extends keyof D
		? undefined extends D[K]
			? T[K]
			: NonNullable<T[K]>
		: T[K];
};

/**
 * Extract the validated type from a schema
 */
export type InferSchemaType<S extends ConfigSchema<unknown>> =
	S extends ConfigSchema<infer T> ? T : never;

/**
 * Strict configuration type that errors on extra properties
 */
export type StrictConfig<T> = T & { [key: string]: never };

/**
 * Configuration merge priority
 */
export type MergePriority = "left" | "right" | "deep";

/**
 * Create a validation error helper
 *
 * @param path - Field path
 * @param message - Error message
 * @param code - Optional error code
 * @returns ValidationError object
 */
export function createValidationError(
	path: string,
	message: string,
	code?: string
): ValidationError {
	return { path, message, code };
}

/**
 * Create a successful validation result
 *
 * @param data - Validated data
 * @returns Successful ValidationResult
 */
export function validResult<T>(data: T): ValidationResult<T> {
	return { valid: true, data };
}

/**
 * Create a failed validation result
 *
 * @param errors - Validation errors
 * @returns Failed ValidationResult
 */
export function invalidResult<T>(
	errors: ValidationError[]
): ValidationResult<T> {
	return { valid: false, errors };
}

/**
 * Combine multiple validation results
 *
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidationResults<T extends unknown[]>(
	results: { [K in keyof T]: ValidationResult<T[K]> }
): ValidationResult<T> {
	const errors: ValidationError[] = [];
	const data: unknown[] = [];

	for (const result of results) {
		if (result.valid) {
			data.push(result.data);
		} else {
			errors.push(...result.errors);
		}
	}

	if (errors.length > 0) {
		return invalidResult(errors);
	}

	return validResult(data as T);
}

/**
 * Validate that a value is not null or undefined
 *
 * @param value - Value to check
 * @param path - Field path for error reporting
 * @returns Validation result
 */
export function validateRequired<T>(
	value: T | null | undefined,
	path: string
): ValidationResult<T> {
	if (value === null || value === undefined) {
		return invalidResult([
			createValidationError(path, `${path} is required`, "REQUIRED"),
		]);
	}
	return validResult(value);
}

/**
 * Validate a string value
 *
 * @param value - Value to validate
 * @param path - Field path
 * @param options - Validation options
 * @returns Validation result
 */
export function validateString(
	value: unknown,
	path: string,
	options: {
		minLength?: number;
		maxLength?: number;
		pattern?: RegExp;
	} = {}
): ValidationResult<string> {
	if (typeof value !== "string") {
		return invalidResult([
			createValidationError(path, `${path} must be a string`, "TYPE_STRING"),
		]);
	}

	const errors: ValidationError[] = [];

	if (options.minLength !== undefined && value.length < options.minLength) {
		errors.push(
			createValidationError(
				path,
				`${path} must be at least ${options.minLength} characters`,
				"MIN_LENGTH"
			)
		);
	}

	if (options.maxLength !== undefined && value.length > options.maxLength) {
		errors.push(
			createValidationError(
				path,
				`${path} must be at most ${options.maxLength} characters`,
				"MAX_LENGTH"
			)
		);
	}

	if (options.pattern && !options.pattern.test(value)) {
		errors.push(
			createValidationError(
				path,
				`${path} does not match the required pattern`,
				"PATTERN"
			)
		);
	}

	return errors.length > 0 ? invalidResult(errors) : validResult(value);
}

/**
 * Validate a number value
 *
 * @param value - Value to validate
 * @param path - Field path
 * @param options - Validation options
 * @returns Validation result
 */
export function validateNumber(
	value: unknown,
	path: string,
	options: {
		min?: number;
		max?: number;
		integer?: boolean;
	} = {}
): ValidationResult<number> {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return invalidResult([
			createValidationError(path, `${path} must be a number`, "TYPE_NUMBER"),
		]);
	}

	const errors: ValidationError[] = [];

	if (options.min !== undefined && value < options.min) {
		errors.push(
			createValidationError(
				path,
				`${path} must be at least ${options.min}`,
				"MIN_VALUE"
			)
		);
	}

	if (options.max !== undefined && value > options.max) {
		errors.push(
			createValidationError(
				path,
				`${path} must be at most ${options.max}`,
				"MAX_VALUE"
			)
		);
	}

	if (options.integer && !Number.isInteger(value)) {
		errors.push(
			createValidationError(path, `${path} must be an integer`, "INTEGER")
		);
	}

	return errors.length > 0 ? invalidResult(errors) : validResult(value);
}

/**
 * Validate a boolean value
 *
 * @param value - Value to validate
 * @param path - Field path
 * @returns Validation result
 */
export function validateBoolean(
	value: unknown,
	path: string
): ValidationResult<boolean> {
	if (typeof value !== "boolean") {
		return invalidResult([
			createValidationError(path, `${path} must be a boolean`, "TYPE_BOOLEAN"),
		]);
	}
	return validResult(value);
}

/**
 * Validate an array value
 *
 * @param value - Value to validate
 * @param path - Field path
 * @param itemValidator - Validator for array items
 * @returns Validation result
 */
export function validateArray<T>(
	value: unknown,
	path: string,
	itemValidator?: (item: unknown, index: number) => ValidationResult<T>
): ValidationResult<T[]> {
	if (!Array.isArray(value)) {
		return invalidResult([
			createValidationError(path, `${path} must be an array`, "TYPE_ARRAY"),
		]);
	}

	if (!itemValidator) {
		return validResult(value as T[]);
	}

	const errors: ValidationError[] = [];
	const validItems: T[] = [];

	for (let i = 0; i < value.length; i++) {
		const result = itemValidator(value[i], i);
		if (result.valid) {
			validItems.push(result.data);
		} else {
			for (const error of result.errors) {
				errors.push({
					...error,
					path: `${path}[${i}].${error.path}`,
				});
			}
		}
	}

	return errors.length > 0 ? invalidResult(errors) : validResult(validItems);
}
