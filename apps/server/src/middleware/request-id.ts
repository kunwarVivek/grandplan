// ============================================
// REQUEST ID MIDDLEWARE
// ============================================

import { randomUUID } from "node:crypto";
import { logger } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";

/**
 * Request ID header name
 * Standard header for distributed tracing
 */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Extend Express Request to include requestId and logger
 */
declare global {
	namespace Express {
		interface Request {
			requestId: string;
			log: typeof logger;
		}
	}
}

/**
 * Options for request ID middleware
 */
export interface RequestIdMiddlewareOptions {
	/**
	 * Header name to read/write request ID
	 * @default "x-request-id"
	 */
	headerName?: string;

	/**
	 * Whether to trust the incoming request ID header
	 * Set to false in production if not behind a trusted proxy
	 * @default true
	 */
	trustRequestHeader?: boolean;

	/**
	 * Custom ID generator function
	 * @default randomUUID
	 */
	generator?: () => string;

	/**
	 * Whether to set the response header
	 * @default true
	 */
	setResponseHeader?: boolean;
}

/**
 * Validate that a string looks like a valid request ID
 * Accepts UUID format or other reasonable ID formats (alphanumeric with dashes/underscores)
 */
function isValidRequestId(id: string): boolean {
	if (!id || typeof id !== "string") {
		return false;
	}
	// Allow UUIDs, nanoids, and similar formats (alphanumeric, dashes, underscores)
	// Max length 128 to prevent abuse
	return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * Creates request ID middleware factory
 *
 * This middleware:
 * - Generates a unique request ID for each request (UUID v4)
 * - Accepts an existing X-Request-ID header if provided (and valid)
 * - Attaches the request ID to the request object (req.requestId)
 * - Adds X-Request-ID header to responses
 * - Creates a child logger with the request ID for correlation
 *
 * @example
 * ```typescript
 * // Basic usage
 * app.use(requestIdMiddleware());
 *
 * // With custom options
 * app.use(requestIdMiddleware({
 *   trustRequestHeader: false,  // Always generate new ID
 *   headerName: 'x-correlation-id'
 * }));
 *
 * // In route handler
 * app.get('/api/users', (req, res) => {
 *   req.log.info('Fetching users'); // Logs include requestId
 *   res.json({ requestId: req.requestId, users: [] });
 * });
 * ```
 */
export function requestIdMiddleware(
	options: RequestIdMiddlewareOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
	const {
		headerName = REQUEST_ID_HEADER,
		trustRequestHeader = true,
		generator = randomUUID,
		setResponseHeader = true,
	} = options;

	const headerNameLower = headerName.toLowerCase();

	return (req: Request, res: Response, next: NextFunction): void => {
		// Try to get existing request ID from header
		let requestId: string | undefined;

		if (trustRequestHeader) {
			const incomingId = req.headers[headerNameLower];
			if (typeof incomingId === "string" && isValidRequestId(incomingId)) {
				requestId = incomingId;
			}
		}

		// Generate new ID if not provided or invalid
		if (!requestId) {
			requestId = generator();
		}

		// Attach to request object
		req.requestId = requestId;

		// Create child logger with request context
		req.log = logger.child({
			requestId,
			method: req.method,
			path: req.path,
		});

		// Set response header
		if (setResponseHeader) {
			res.setHeader(headerName, requestId);
		}

		// Log request start (debug level to avoid noise)
		req.log.debug("Request started", {
			url: req.originalUrl,
			userAgent: req.headers["user-agent"],
			ip: req.ip || req.socket.remoteAddress,
		});

		// Track response for logging
		const startTime = Date.now();

		// Log on response finish
		res.on("finish", () => {
			const duration = Date.now() - startTime;
			const logContext = {
				statusCode: res.statusCode,
				duration,
				contentLength: res.get("content-length"),
			};

			if (res.statusCode >= 500) {
				req.log.error("Request completed", logContext);
			} else if (res.statusCode >= 400) {
				req.log.warn("Request completed", logContext);
			} else {
				req.log.info("Request completed", logContext);
			}
		});

		next();
	};
}

/**
 * Get request ID from request object
 * Utility function for use in places where full request object isn't available
 */
export function getRequestId(req: Request): string {
	return req.requestId || "unknown";
}

/**
 * Default middleware instance with standard options
 */
export const defaultRequestIdMiddleware = requestIdMiddleware();
