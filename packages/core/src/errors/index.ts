// ============================================
// CUSTOM ERROR CLASSES
// ============================================

/**
 * Base application error class that extends the native Error.
 *
 * AppError provides a standardized error structure for the entire application,
 * including HTTP status codes, error codes for programmatic handling, and
 * a flag to distinguish operational errors from programming errors.
 *
 * Operational errors are expected errors that can occur during normal operation
 * (e.g., validation failures, resource not found). Programming errors are bugs
 * that should be fixed in the code.
 *
 * @example
 * ```typescript
 * // Throw a custom operational error
 * throw new AppError('Payment processing failed', 502, 'PAYMENT_FAILED');
 *
 * // Throw a non-operational (programming) error
 * throw new AppError('Unexpected state', 500, 'INTERNAL_ERROR', false);
 *
 * // Use in error handling middleware
 * if (isAppError(error) && error.isOperational) {
 *   res.status(error.statusCode).json({ code: error.code, message: error.message });
 * }
 * ```
 */
export class AppError extends Error {
	/**
	 * HTTP status code associated with this error.
	 * Used to determine the response status when the error propagates to HTTP handlers.
	 */
	public readonly statusCode: number;

	/**
	 * Machine-readable error code for programmatic error handling.
	 * Clients can use this code to display localized messages or take specific actions.
	 */
	public readonly code: string;

	/**
	 * Indicates whether this is an operational error (true) or a programming error (false).
	 * Operational errors are expected and handled gracefully; programming errors may require
	 * investigation and code fixes.
	 */
	public readonly isOperational: boolean;

	/**
	 * Creates a new AppError instance.
	 *
	 * @param message - Human-readable error message describing what went wrong
	 * @param statusCode - HTTP status code (default: 500)
	 * @param code - Machine-readable error code (default: "INTERNAL_ERROR")
	 * @param isOperational - Whether this is an operational error (default: true)
	 */
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

/**
 * Error thrown when input validation fails.
 *
 * ValidationError is used when user-provided data does not meet the required
 * constraints (e.g., missing required fields, invalid formats, out-of-range values).
 * It includes a structured errors object that maps field names to arrays of error messages,
 * making it easy to display field-specific validation feedback to users.
 *
 * @example
 * ```typescript
 * // Single field validation error
 * throw new ValidationError('Invalid input', {
 *   email: ['Email is required', 'Email must be a valid email address']
 * });
 *
 * // Multiple field validation errors
 * throw new ValidationError('Validation failed', {
 *   username: ['Username must be at least 3 characters'],
 *   password: ['Password must contain a number', 'Password must be at least 8 characters']
 * });
 *
 * // Handling in API response
 * if (error instanceof ValidationError) {
 *   res.status(400).json({
 *     message: error.message,
 *     errors: error.errors
 *   });
 * }
 * ```
 */
export class ValidationError extends AppError {
	/**
	 * Map of field names to arrays of validation error messages.
	 * Each key represents a field that failed validation, and the value
	 * is an array of human-readable error messages for that field.
	 */
	public readonly errors: Record<string, string[]>;

	/**
	 * Creates a new ValidationError instance.
	 *
	 * @param message - Overall validation error message
	 * @param errors - Map of field names to arrays of error messages (default: empty object)
	 */
	constructor(message: string, errors: Record<string, string[]> = {}) {
		super(message, 400, "VALIDATION_ERROR");
		this.errors = errors;
	}
}

/**
 * Error thrown when a requested resource cannot be found.
 *
 * NotFoundError is used when attempting to access, modify, or delete a resource
 * that does not exist in the system. It automatically constructs a descriptive
 * message based on the resource type and optional identifier.
 *
 * @example
 * ```typescript
 * // Resource not found by ID
 * const user = await userRepository.findById(userId);
 * if (!user) {
 *   throw new NotFoundError('User', userId);
 *   // Message: "User with id 'abc123' not found"
 * }
 *
 * // Resource not found (no specific ID)
 * const config = await configRepository.findActive();
 * if (!config) {
 *   throw new NotFoundError('Active configuration');
 *   // Message: "Active configuration not found"
 * }
 *
 * // In route handlers
 * app.get('/users/:id', async (req, res) => {
 *   const user = await findUser(req.params.id);
 *   if (!user) throw new NotFoundError('User', req.params.id);
 *   res.json(user);
 * });
 * ```
 */
export class NotFoundError extends AppError {
	/**
	 * Creates a new NotFoundError instance.
	 *
	 * @param resource - The type or name of the resource that was not found
	 * @param id - Optional identifier of the specific resource (e.g., UUID, slug)
	 */
	constructor(resource: string, id?: string) {
		const message = id
			? `${resource} with id '${id}' not found`
			: `${resource} not found`;
		super(message, 404, "NOT_FOUND");
	}
}

/**
 * Error thrown when authentication is required but missing or invalid.
 *
 * UnauthorizedError (HTTP 401) indicates that the request lacks valid authentication
 * credentials. This is different from ForbiddenError (HTTP 403), which indicates that
 * the user is authenticated but lacks permission for the requested action.
 *
 * Common scenarios:
 * - Missing authentication token/header
 * - Expired authentication token
 * - Invalid credentials
 * - Malformed authentication header
 *
 * @example
 * ```typescript
 * // Missing authentication
 * if (!req.headers.authorization) {
 *   throw new UnauthorizedError('Authentication required');
 * }
 *
 * // Invalid token
 * try {
 *   const payload = jwt.verify(token, secret);
 * } catch (err) {
 *   throw new UnauthorizedError('Invalid or expired token');
 * }
 *
 * // In authentication middleware
 * const authMiddleware = async (req, res, next) => {
 *   const user = await validateSession(req.cookies.session);
 *   if (!user) throw new UnauthorizedError();
 *   req.user = user;
 *   next();
 * };
 * ```
 */
export class UnauthorizedError extends AppError {
	/**
	 * Creates a new UnauthorizedError instance.
	 *
	 * @param message - Error message (default: "Unauthorized")
	 */
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
	}
}

/**
 * Error thrown when the authenticated user lacks permission for the requested action.
 *
 * ForbiddenError (HTTP 403) indicates that the server understood the request but
 * refuses to authorize it. Unlike UnauthorizedError (HTTP 401), the user's identity
 * is known, but they lack the necessary permissions.
 *
 * Common scenarios:
 * - User trying to access another user's private data
 * - User without admin role trying to perform admin actions
 * - Attempting to modify a read-only resource
 * - Organization member without required role permissions
 *
 * @example
 * ```typescript
 * // Permission check in service layer
 * async function deleteProject(projectId: string, userId: string) {
 *   const project = await projectRepo.findById(projectId);
 *   if (project.ownerId !== userId) {
 *     throw new ForbiddenError('Only the project owner can delete this project');
 *   }
 *   await projectRepo.delete(projectId);
 * }
 *
 * // Role-based access control
 * function requireRole(allowedRoles: string[]) {
 *   return (req, res, next) => {
 *     if (!allowedRoles.includes(req.user.role)) {
 *       throw new ForbiddenError('Insufficient permissions for this action');
 *     }
 *     next();
 *   };
 * }
 *
 * // Resource ownership check
 * if (!user.organizationIds.includes(organizationId)) {
 *   throw new ForbiddenError('You do not have access to this organization');
 * }
 * ```
 */
export class ForbiddenError extends AppError {
	/**
	 * Creates a new ForbiddenError instance.
	 *
	 * @param message - Error message (default: "Forbidden")
	 */
	constructor(message = "Forbidden") {
		super(message, 403, "FORBIDDEN");
	}
}

/**
 * Error thrown when a request conflicts with the current state of a resource.
 *
 * ConflictError (HTTP 409) indicates that the request could not be completed due to
 * a conflict with the current state of the target resource. This often occurs with
 * operations that would violate uniqueness constraints or business rules.
 *
 * Common scenarios:
 * - Creating a resource with a duplicate unique identifier (e.g., email, username)
 * - Optimistic concurrency violations (version mismatch)
 * - State transitions that are not allowed (e.g., publishing already published content)
 * - Race conditions in concurrent operations
 *
 * @example
 * ```typescript
 * // Duplicate email during registration
 * const existingUser = await userRepo.findByEmail(email);
 * if (existingUser) {
 *   throw new ConflictError('A user with this email already exists');
 * }
 *
 * // Optimistic concurrency check
 * async function updateDocument(id: string, data: UpdateData, expectedVersion: number) {
 *   const doc = await documentRepo.findById(id);
 *   if (doc.version !== expectedVersion) {
 *     throw new ConflictError('Document was modified by another user. Please refresh and try again.');
 *   }
 *   await documentRepo.update(id, { ...data, version: expectedVersion + 1 });
 * }
 *
 * // State transition validation
 * if (order.status === 'shipped') {
 *   throw new ConflictError('Cannot cancel an order that has already been shipped');
 * }
 * ```
 */
export class ConflictError extends AppError {
	/**
	 * Creates a new ConflictError instance.
	 *
	 * @param message - Error message describing the conflict
	 */
	constructor(message: string) {
		super(message, 409, "CONFLICT");
	}
}

/**
 * Error thrown when a rate limit has been exceeded.
 *
 * RateLimitError (HTTP 429) indicates that the user has sent too many requests
 * in a given amount of time. It includes a `retryAfter` property that indicates
 * how many seconds the client should wait before making another request.
 *
 * This error is typically thrown by rate limiting middleware and should be
 * handled by informing users when they can retry their request.
 *
 * Common scenarios:
 * - API rate limiting (requests per minute/hour)
 * - Login attempt throttling
 * - Resource-intensive operations (file uploads, exports)
 * - Third-party API quota exhaustion
 *
 * @example
 * ```typescript
 * // Rate limiting middleware
 * const rateLimiter = async (req, res, next) => {
 *   const key = `rate_limit:${req.ip}`;
 *   const requests = await redis.incr(key);
 *   if (requests === 1) await redis.expire(key, 60);
 *
 *   if (requests > MAX_REQUESTS_PER_MINUTE) {
 *     const ttl = await redis.ttl(key);
 *     throw new RateLimitError('Rate limit exceeded. Please slow down.', ttl);
 *   }
 *   next();
 * };
 *
 * // Handling rate limit errors in response
 * if (error instanceof RateLimitError) {
 *   res.set('Retry-After', String(error.retryAfter));
 *   res.status(429).json({
 *     message: error.message,
 *     retryAfter: error.retryAfter
 *   });
 * }
 *
 * // Client-side handling
 * if (error.code === 'RATE_LIMIT_EXCEEDED') {
 *   showToast(`Please wait ${error.retryAfter} seconds before trying again`);
 * }
 * ```
 */
export class RateLimitError extends AppError {
	/**
	 * Number of seconds the client should wait before retrying.
	 * This value should be included in the Retry-After response header.
	 */
	public readonly retryAfter: number;

	/**
	 * Creates a new RateLimitError instance.
	 *
	 * @param message - Error message (default: "Too many requests")
	 * @param retryAfter - Seconds until the client can retry (default: 60)
	 */
	constructor(message = "Too many requests", retryAfter = 60) {
		super(message, 429, "RATE_LIMIT_EXCEEDED");
		this.retryAfter = retryAfter;
	}
}

/**
 * Error thrown when an external service dependency fails.
 *
 * ExternalServiceError (HTTP 502 Bad Gateway) is used when the application
 * fails to communicate with an external service or receives an invalid response.
 * It includes the service name for easier debugging and monitoring.
 *
 * Common scenarios:
 * - Third-party API failures (payment providers, email services)
 * - Database connection failures
 * - External authentication provider errors
 * - Timeout when calling external services
 * - Invalid responses from microservices
 *
 * @example
 * ```typescript
 * // Payment service integration
 * async function processPayment(orderId: string, amount: number) {
 *   try {
 *     const result = await stripeClient.charges.create({ amount });
 *     return result;
 *   } catch (error) {
 *     throw new ExternalServiceError('Stripe', 'Failed to process payment');
 *   }
 * }
 *
 * // Email service integration
 * async function sendWelcomeEmail(user: User) {
 *   try {
 *     await sendgrid.send({ to: user.email, template: 'welcome' });
 *   } catch (error) {
 *     throw new ExternalServiceError('SendGrid', `Failed to send email: ${error.message}`);
 *   }
 * }
 *
 * // Handling external service errors
 * if (error instanceof ExternalServiceError) {
 *   logger.error(`External service failure`, { service: error.service });
 *   alertOps(`${error.service} is experiencing issues`);
 * }
 * ```
 */
export class ExternalServiceError extends AppError {
	/**
	 * Name of the external service that failed.
	 * Used for logging, monitoring, and alerting purposes.
	 */
	public readonly service: string;

	/**
	 * Creates a new ExternalServiceError instance.
	 *
	 * @param service - Name of the external service that failed (e.g., "Stripe", "SendGrid")
	 * @param message - Detailed error message describing what went wrong
	 */
	constructor(service: string, message: string) {
		super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR");
		this.service = service;
	}
}

// ============================================
// ERROR TYPE GUARDS
// ============================================

/**
 * Type guard to check if an error is an instance of AppError.
 *
 * Use this function to safely narrow the type of an unknown error to AppError,
 * enabling access to AppError-specific properties like statusCode, code, and isOperational.
 *
 * @param error - The error to check
 * @returns True if the error is an AppError instance
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (isAppError(error)) {
 *     // TypeScript knows error is AppError here
 *     res.status(error.statusCode).json({ code: error.code, message: error.message });
 *   } else {
 *     // Handle unexpected errors
 *     res.status(500).json({ message: 'Internal server error' });
 *   }
 * }
 * ```
 */
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

/**
 * Check if an error is an operational error that can be handled gracefully.
 *
 * Operational errors are expected errors that occur during normal application
 * operation (e.g., validation failures, not found errors). Non-operational errors
 * are programming errors or unexpected failures that may require investigation.
 *
 * This distinction is useful for error handling strategies:
 * - Operational errors: Show user-friendly messages, log at info/warn level
 * - Non-operational errors: Show generic messages, log at error level, alert ops
 *
 * @param error - The error to check
 * @returns True if the error is an operational AppError
 *
 * @example
 * ```typescript
 * // Global error handler
 * app.use((error, req, res, next) => {
 *   if (isOperationalError(error)) {
 *     // Expected error - send appropriate response
 *     logger.warn('Operational error', { error });
 *     res.status(error.statusCode).json({ message: error.message });
 *   } else {
 *     // Unexpected error - log and send generic response
 *     logger.error('Unexpected error', { error });
 *     alertOps(error);
 *     res.status(500).json({ message: 'Something went wrong' });
 *   }
 * });
 * ```
 */
export function isOperationalError(error: unknown): boolean {
	return isAppError(error) && error.isOperational;
}
