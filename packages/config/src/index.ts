/**
 * @grandplan/config - TypeScript Configuration Helpers
 *
 * This package provides reusable TypeScript utilities for:
 * - Path alias configuration and management
 * - Environment variable type helpers
 * - Configuration validation types
 * - Common utility types used across the monorepo
 */

// Path Aliases
export {
	type PathAliasEntry,
	type PathAliasesConfig,
	pathAliasPresets,
	buildPathAliases,
	mergePathAliases,
	createAlias,
	packageAlias,
} from "./path-aliases.js";

// Environment Types
export {
	type NodeEnv,
	type LogLevel,
	type RequiredEnv,
	type OptionalEnv,
	type ServerOnlyEnv,
	type PublicEnv,
	type BuildTimeEnv,
	type EnvVarDefinition,
	type EnvSchema,
	type RequiredEnvVars,
	type OptionalEnvVars,
	type EnvContext,
	defineEnvVar,
	envPatterns,
	parseEnvBoolean,
	parseEnvNumber,
	parseEnvList,
	parseEnvJson,
	isEnvDefined,
	getEnv,
	requireEnv,
	createEnvContext,
} from "./env-types.js";

// Validation Types
export {
	type ValidationResult,
	type ValidationError,
	type Validator,
	type ConfigSchema,
	type FieldSchema,
	type ConfigBuilderResult,
	type DeepPartial,
	type DeepRequired,
	type DeepReadonly,
	type WithDefaults,
	type InferSchemaType,
	type StrictConfig,
	type MergePriority,
	createValidationError,
	validResult,
	invalidResult,
	combineValidationResults,
	validateRequired,
	validateString,
	validateNumber,
	validateBoolean,
	validateArray,
} from "./validation-types.js";

// Utility Types
export {
	// Object manipulation
	type PartialBy,
	type RequiredBy,
	type Nullable,
	type NullableBy,
	type NonNullableProps,
	type Mutable,
	type DeepMutable,
	type PickByType,
	type OmitByType,
	type KeysOfType,
	type Merge,
	type DeepMerge,

	// Function types
	type Parameters,
	type ReturnOf,
	type AsyncFunction,
	type Awaited,
	type DeepAwaited,
	type Constructor,
	type AbstractConstructor,

	// Array and tuple types
	type ArrayElement,
	type ReadonlyArrayOf,
	type TupleToUnion,
	type NonEmptyArray,
	type Head,
	type Tail,
	type Last,
	isNonEmpty,

	// String literal types
	type Lowercase,
	type Uppercase,
	type KebabCase,
	type Prefixed,
	type Suffixed,

	// Union and intersection types
	type Defined,
	type UnionToIntersection,
	type AllKeys,
	type CommonKeys,
	type Equals,

	// Branded types
	type Brand,
	type UUID,
	type Email,
	type URL,
	type Timestamp,
	type PositiveNumber,
	type Unbrand,

	// Conditional types
	type If,
	type IsAny,
	type IsNever,
	type IsUnknown,
	type Exact,

	// Record and map types
	type ObjectKeys,
	type ObjectEntries,
	type Dictionary,
	type IndexSignature,
	type ValueOf,

	// Utility functions
	typedKeys,
	typedEntries,
	typedFromEntries,
	exhaustive,
	assertDefined,
	isObject,
	isString,
	isNumber,
	isFunction,
} from "./utility-types.js";
