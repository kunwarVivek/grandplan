// ============================================
// CUSTOM ERROR CLASSES
// ============================================

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: string;
	public readonly isOperational: boolean;

	constructor(
		message: string,
		statusCode = 500,
		code = "INTERNAL_ERROR",
		isOperational = true,
	) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.isOperational = isOperational;

		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	public readonly errors: Record<string, string[]>;

	constructor(message: string, errors: Record<string, string[]> = {}) {
		super(message, 400, "VALIDATION_ERROR");
		this.errors = errors;
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		const message = id
			? `${resource} with id '${id}' not found`
			: `${resource} not found`;
		super(message, 404, "NOT_FOUND");
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
	}
}

export class ForbiddenError extends AppError {
	constructor(message = "Forbidden") {
		super(message, 403, "FORBIDDEN");
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(message, 409, "CONFLICT");
	}
}

export class RateLimitError extends AppError {
	public readonly retryAfter: number;

	constructor(message = "Too many requests", retryAfter = 60) {
		super(message, 429, "RATE_LIMIT_EXCEEDED");
		this.retryAfter = retryAfter;
	}
}

export class ExternalServiceError extends AppError {
	public readonly service: string;

	constructor(service: string, message: string) {
		super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR");
		this.service = service;
	}
}

// Error type guards
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
	return isAppError(error) && error.isOperational;
}
