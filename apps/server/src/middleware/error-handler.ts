// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

import { isAppError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}

export function errorHandler(
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	console.error("Error:", err);

	if (isAppError(err)) {
		const response: ErrorResponse = {
			success: false,
			error: {
				code: err.code,
				message: err.message,
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
					details: { fields: prismaError.meta?.target },
				},
			});
			return;
		}

		if (prismaError.code === "P2025") {
			res.status(404).json({
				success: false,
				error: {
					code: "NOT_FOUND",
					message: "Record not found",
				},
			});
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
			},
		});
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
		},
	});
}

export function notFoundHandler(req: Request, res: Response): void {
	res.status(404).json({
		success: false,
		error: {
			code: "NOT_FOUND",
			message: `Route ${req.method} ${req.path} not found`,
		},
	});
}
