/**
 * Production-grade structured logger for @grandplan/core
 *
 * Features:
 * - Structured JSON output for production
 * - Pretty printing for development
 * - Log levels: debug, info, warn, error
 * - Child logger support with context inheritance
 * - Request/correlation ID support
 * - Sensitive field redaction
 * - Error serialization with stack traces
 *
 * Configuration via environment variables:
 * - LOG_LEVEL: debug | info | warn | error (default: info)
 * - NODE_ENV: production | development (affects output format)
 * - LOG_REDACT_FIELDS: comma-separated list of fields to redact
 *
 * @example
 * ```typescript
 * import { logger, createLogger } from '@grandplan/core';
 *
 * // Default logger
 * logger.info('Server started', { port: 3000 });
 *
 * // Child logger with context
 * const reqLogger = logger.child({ requestId: 'abc-123' });
 * reqLogger.info('Processing request');
 *
 * // Custom logger with different config
 * const customLogger = createLogger({ service: 'auth' });
 * ```
 */

// ============================================
// Types
// ============================================

/** Available log levels ordered by severity */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Context object for structured logging.
 *
 * LogContext is a flexible key-value container for adding contextual information
 * to log entries. Common uses include request IDs, user IDs, operation names,
 * and any domain-specific data that aids in debugging and monitoring.
 *
 * @example
 * ```typescript
 * const context: LogContext = {
 *   requestId: 'req-123',
 *   userId: 'user-456',
 *   operation: 'createProject',
 *   projectName: 'My Project'
 * };
 * logger.info('Project created', context);
 * ```
 */
export interface LogContext {
	[key: string]: unknown;
}

/**
 * Serialized error object for structured JSON output.
 *
 * SerializedError represents an Error object in a JSON-serializable format,
 * preserving the essential information (name, message, stack trace) while
 * adding support for error codes and cause chains. This format is used
 * when errors are logged in structured JSON format.
 *
 * The structure supports:
 * - Standard Error properties (name, message, stack)
 * - Node.js error codes (e.g., 'ENOENT', 'ECONNREFUSED')
 * - ES2022 error cause chains for debugging nested errors
 *
 * @example
 * ```typescript
 * // Example serialized error in JSON logs
 * {
 *   "name": "ValidationError",
 *   "message": "Invalid email format",
 *   "stack": "ValidationError: Invalid email format\n    at validateEmail (/app/validators.js:15:11)...",
 *   "code": "VALIDATION_ERROR",
 *   "cause": {
 *     "name": "TypeError",
 *     "message": "Cannot read property 'includes' of undefined"
 *   }
 * }
 *
 * // How errors are serialized by the logger
 * try {
 *   await processFile(path);
 * } catch (error) {
 *   // Error is automatically serialized when logged
 *   logger.error('Failed to process file', error, { path });
 *   // Output includes serialized error with stack trace and cause chain
 * }
 * ```
 */
export interface SerializedError {
	/**
	 * The error class name (e.g., "Error", "TypeError", "ValidationError").
	 * Useful for quickly identifying the type of error in logs.
	 */
	name: string;

	/**
	 * The error message describing what went wrong.
	 */
	message: string;

	/**
	 * The stack trace captured when the error was created.
	 * Invaluable for debugging the source of errors.
	 * May be omitted in production logs for security reasons.
	 */
	stack?: string;

	/**
	 * Error code if present on the original error.
	 * Common in Node.js system errors (e.g., 'ENOENT', 'ECONNREFUSED')
	 * and custom application errors.
	 */
	code?: string | number;

	/**
	 * The serialized cause of this error, if present.
	 * Supports ES2022 error cause chains, enabling full error
	 * context to be preserved in structured logs.
	 */
	cause?: SerializedError;
}

/** Configuration options for logger creation */
export interface LoggerConfig {
	/** Minimum log level to output */
	level?: LogLevel;
	/** Base context attached to all log entries */
	context?: LogContext;
	/** Fields to redact from output */
	redactFields?: string[];
	/** Force JSON output even in development */
	forceJson?: boolean;
	/** Include timestamp in logs (default: true) */
	timestamp?: boolean;
	/** Include process info (pid, hostname) in production logs */
	processInfo?: boolean;
}

/** Logger interface */
export interface Logger {
	/** Log debug message */
	debug(message: string, context?: LogContext): void;
	/** Log info message */
	info(message: string, context?: LogContext): void;
	/** Log warning message */
	warn(message: string, context?: LogContext): void;
	/** Log error message with optional error object and context */
	error(message: string, error?: Error | null, context?: LogContext): void;
	/** Log error message with context only (no error object) */
	error(message: string, context?: LogContext): void;
	/** Create child logger with additional context */
	child(context: LogContext): Logger;
	/** Check if a log level is enabled */
	isLevelEnabled(level: LogLevel): boolean;
	/** Get current log level */
	getLevel(): LogLevel;
	/** Set log level dynamically */
	setLevel(level: LogLevel): void;
}

/** Internal log entry structure */
interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	[key: string]: unknown;
}

// ============================================
// Constants
// ============================================

/** Log level numeric values for comparison */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

/** ANSI color codes for terminal output */
const COLORS = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
	debug: "\x1b[36m", // Cyan
	info: "\x1b[32m", // Green
	warn: "\x1b[33m", // Yellow
	error: "\x1b[31m", // Red
} as const;

/** Default fields to redact */
const DEFAULT_REDACT_FIELDS = [
	"password",
	"secret",
	"token",
	"apiKey",
	"api_key",
	"apikey",
	"authorization",
	"cookie",
	"creditCard",
	"credit_card",
	"ssn",
	"accessToken",
	"access_token",
	"refreshToken",
	"refresh_token",
	"privateKey",
	"private_key",
];

/** Redaction placeholder */
const REDACTED = "[REDACTED]";

// ============================================
// Utility Functions
// ============================================

/**
 * Get log level from environment variable
 */
function getEnvLogLevel(): LogLevel {
	const envLevel = process.env.LOG_LEVEL?.toLowerCase();
	if (envLevel && envLevel in LOG_LEVEL_VALUES) {
		return envLevel as LogLevel;
	}
	return "info";
}

/**
 * Get redact fields from environment variable
 */
function getEnvRedactFields(): string[] {
	const envFields = process.env.LOG_REDACT_FIELDS;
	if (envFields) {
		return envFields.split(",").map((f) => f.trim().toLowerCase());
	}
	return [];
}

/**
 * Check if running in production
 */
function isProduction(): boolean {
	return process.env.NODE_ENV === "production";
}

/**
 * Check if running in a TTY (terminal)
 */
function isTTY(): boolean {
	return Boolean(process.stdout?.isTTY);
}

/**
 * Serialize an error object for structured logging
 */
function serializeError(error: Error): SerializedError {
	const serialized: SerializedError = {
		name: error.name,
		message: error.message,
	};

	if (error.stack) {
		serialized.stack = error.stack;
	}

	// Include error code if present (common in Node.js errors)
	if ("code" in error && error.code !== undefined) {
		serialized.code = error.code as string | number;
	}

	// Handle error cause (ES2022)
	if (error.cause instanceof Error) {
		serialized.cause = serializeError(error.cause);
	}

	return serialized;
}

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveFields(
	obj: unknown,
	redactFields: Set<string>,
	visited = new WeakSet<object>(),
): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj !== "object") {
		return obj;
	}

	// Handle circular references
	if (visited.has(obj as object)) {
		return "[Circular]";
	}
	visited.add(obj as object);

	if (Array.isArray(obj)) {
		return obj.map((item) => redactSensitiveFields(item, redactFields, visited));
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (redactFields.has(key.toLowerCase())) {
			result[key] = REDACTED;
		} else if (typeof value === "object" && value !== null) {
			result[key] = redactSensitiveFields(value, redactFields, visited);
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Safely stringify a value, handling circular references
 */
function safeStringify(obj: unknown, pretty = false): string {
	const seen = new WeakSet<object>();

	return JSON.stringify(
		obj,
		(_key, value) => {
			if (typeof value === "object" && value !== null) {
				if (seen.has(value)) {
					return "[Circular]";
				}
				seen.add(value);
			}
			// Handle BigInt
			if (typeof value === "bigint") {
				return value.toString();
			}
			return value;
		},
		pretty ? 2 : undefined,
	);
}

/**
 * Format a log entry as JSON for production
 */
function formatJson(entry: LogEntry): string {
	return safeStringify(entry);
}

/**
 * Format a log entry for development with colors
 */
function formatPretty(entry: LogEntry, useColors: boolean): string {
	const { timestamp, level, message, ...rest } = entry;

	const levelUpper = level.toUpperCase().padEnd(5);
	const color = useColors ? COLORS[level] : "";
	const reset = useColors ? COLORS.reset : "";
	const dim = useColors ? COLORS.dim : "";

	// Format timestamp
	const timeStr = timestamp.replace("T", " ").replace("Z", "");

	// Build the main line
	let output = `${dim}[${timeStr}]${reset} ${color}${levelUpper}${reset} ${message}`;

	// Add context if present
	if (Object.keys(rest).length > 0) {
		// Pretty print context on new line for better readability
		const contextStr = safeStringify(rest, true);
		output += `\n${dim}${contextStr}${reset}`;
	}

	return output;
}

// ============================================
// Logger Implementation
// ============================================

/**
 * Create a production-grade structured logger
 *
 * @param config - Logger configuration options
 * @returns Logger instance
 */
export function createLogger(config: LoggerConfig = {}): Logger {
	const {
		level: configLevel,
		context: baseContext = {},
		redactFields: configRedactFields = [],
		forceJson = false,
		timestamp = true,
		processInfo = true,
	} = config;

	// Merge redact fields
	const allRedactFields = new Set([
		...DEFAULT_REDACT_FIELDS.map((f) => f.toLowerCase()),
		...getEnvRedactFields(),
		...configRedactFields.map((f) => f.toLowerCase()),
	]);

	// Determine output format
	const isProd = isProduction();
	const useJson = forceJson || isProd;
	const useColors = !useJson && isTTY();

	// Current log level (mutable for dynamic changes)
	let currentLevel: LogLevel = configLevel ?? getEnvLogLevel();

	/**
	 * Check if a level should be logged
	 */
	function shouldLog(level: LogLevel): boolean {
		return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[currentLevel];
	}

	/**
	 * Write a log entry
	 */
	function writeLog(
		level: LogLevel,
		message: string,
		context?: LogContext,
		error?: Error | null,
	): void {
		if (!shouldLog(level)) {
			return;
		}

		// Build the log entry
		const entry: LogEntry = {
			timestamp: timestamp ? new Date().toISOString() : "",
			level,
			message,
		};

		// Add process info in production
		if (isProd && processInfo) {
			entry.pid = process.pid;
			if (typeof process.env.HOSTNAME === "string") {
				entry.hostname = process.env.HOSTNAME;
			}
		}

		// Merge contexts
		const mergedContext = { ...baseContext, ...context };

		// Add error if present
		if (error) {
			mergedContext.error = serializeError(error);
		}

		// Redact sensitive fields and add to entry
		const redactedContext = redactSensitiveFields(
			mergedContext,
			allRedactFields,
		) as LogContext;

		for (const [key, value] of Object.entries(redactedContext)) {
			entry[key] = value;
		}

		// Format and output
		const formatted = useJson
			? formatJson(entry)
			: formatPretty(entry, useColors);

		// Use appropriate console method
		switch (level) {
			case "debug":
				console.debug(formatted);
				break;
			case "info":
				console.info(formatted);
				break;
			case "warn":
				console.warn(formatted);
				break;
			case "error":
				console.error(formatted);
				break;
		}
	}

	// Error method implementation that handles both overloads
	function errorMethod(message: string, errorOrContext?: Error | null | LogContext, context?: LogContext): void {
		// Detect if second argument is an Error or context object
		if (errorOrContext instanceof Error) {
			// Called as: error(message, Error, context?)
			writeLog("error", message, context, errorOrContext);
		} else if (errorOrContext === null) {
			// Called as: error(message, null, context?)
			writeLog("error", message, context, null);
		} else {
			// Called as: error(message, context?) - no Error object
			writeLog("error", message, errorOrContext);
		}
	}

	// Return the logger interface
	const logger: Logger = {
		debug(message: string, context?: LogContext): void {
			writeLog("debug", message, context);
		},

		info(message: string, context?: LogContext): void {
			writeLog("info", message, context);
		},

		warn(message: string, context?: LogContext): void {
			writeLog("warn", message, context);
		},

		error: errorMethod as Logger["error"],

		child(context: LogContext): Logger {
			return createLogger({
				level: currentLevel,
				context: { ...baseContext, ...context },
				redactFields: configRedactFields,
				forceJson,
				timestamp,
				processInfo,
			});
		},

		isLevelEnabled(level: LogLevel): boolean {
			return shouldLog(level);
		},

		getLevel(): LogLevel {
			return currentLevel;
		},

		setLevel(level: LogLevel): void {
			currentLevel = level;
		},
	};

	return logger;
}

// ============================================
// Default Logger Instance
// ============================================

/**
 * Default logger instance for use throughout the application
 *
 * @example
 * ```typescript
 * import { logger } from '@grandplan/core';
 *
 * logger.info('Application started', { version: '1.0.0' });
 * logger.error('Failed to connect', new Error('Connection refused'), { host: 'db.example.com' });
 * ```
 */
export const logger: Logger = createLogger();
