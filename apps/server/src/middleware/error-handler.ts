// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

import { isAppError, logger } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		requestId?: string;
		details?: Record<string, unknown>;
	};
}

/**
 * Get the logger for a request (falls back to default logger)
 */
function getRequestLogger(req: Request) {
	return req.log || logger;
}

export function errorHandler(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	const log = getRequestLogger(req);
	const requestId = req.requestId;

	// Log the error with request context
	log.error("Request error", err, {
		errorName: err.name,
		errorCode: (err as { code?: string }).code,
	});

	if (isAppError(err)) {
		const response: ErrorResponse = {
			success: false,
			error: {
				code: err.code,
				message: err.message,
				requestId,
			},
		};

		// Add validation errors if present
		if ("errors" in err && err.errors) {
			response.error.details = { validationErrors: err.errors };
		}

		res.status(err.statusCode).json(response);
		return;
	}

	// Handle Prisma errors
	if (err.name === "PrismaClientKnownRequestError") {
		const prismaError = err as { code?: string; meta?: { target?: string[] } };

		if (prismaError.code === "P2002") {
			res.status(409).json({
				success: false,
				error: {
					code: "CONFLICT",
					message: "A record with this value already exists",
					requestId,
					details: { fields: prismaError.meta?.target },
				},
			} satisfies ErrorResponse);
			return;
		}

		if (prismaError.code === "P2025") {
			res.status(404).json({
				success: false,
				error: {
					code: "NOT_FOUND",
					message: "Record not found",
					requestId,
				},
			} satisfies ErrorResponse);
			return;
		}
	}

	// Handle JWT errors
	if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
		res.status(401).json({
			success: false,
			error: {
				code: "UNAUTHORIZED",
				message: "Invalid or expired token",
				requestId,
			},
		} satisfies ErrorResponse);
		return;
	}

	// Default error response
	res.status(500).json({
		success: false,
		error: {
			code: "INTERNAL_ERROR",
			message:
				process.env.NODE_ENV === "production"
					? "An unexpected error occurred"
					: err.message,
			requestId,
		},
	} satisfies ErrorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
	const log = getRequestLogger(req);
	log.warn("Route not found", {
		method: req.method,
		path: req.path,
	});

	res.status(404).json({
		success: false,
		error: {
			code: "NOT_FOUND",
			message: `Route ${req.method} ${req.path} not found`,
			requestId: req.requestId,
		},
	} satisfies ErrorResponse);
}
