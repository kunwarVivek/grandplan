// ============================================
// PLATFORM USERS CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { platformUserService } from "../../application/services/platform-user.service.js";
import { logPlatformAction } from "../middleware/platform-auth.middleware.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const CreateUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(255).optional(),
});

const ListUsersQuerySchema = z.object({
	search: z.string().optional(),
	status: z.enum(["all", "active", "banned"]).optional(),
	hasOrganization: z
		.string()
		.transform((v) => v === "true")
		.optional(),
	createdAfter: z.string().datetime().optional(),
	createdBefore: z.string().datetime().optional(),
	limit: z.string().transform(Number).optional(),
	offset: z.string().transform(Number).optional(),
	sortBy: z.enum(["createdAt", "name", "email"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

const UpdateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().optional(),
});

const BanUserSchema = z.object({
	reason: z.string().min(1).max(1000),
	expiresAt: z.string().datetime().optional(),
});

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Create a new user
 * POST /api/platform/users
 */
export async function createUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = CreateUserSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const user = await platformUserService.createUser(parseResult.data);

		await logPlatformAction(req, "create_user", "user", user.id, {
			email: user.email,
			name: user.name,
		});

		res.status(201).json({
			success: true,
			data: user,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * List all users
 * GET /api/platform/users
 */
export async function listUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const parseResult = ListUsersQuerySchema.safeParse(req.query);

		if (!parseResult.success) {
			throw new ValidationError("Invalid query parameters", {
				query: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		const filters = {
			...parseResult.data,
			createdAfter: parseResult.data.createdAfter
				? new Date(parseResult.data.createdAfter)
				: undefined,
			createdBefore: parseResult.data.createdBefore
				? new Date(parseResult.data.createdBefore)
				: undefined,
		};

		const result = await platformUserService.listUsers(filters);

		res.status(200).json({
			success: true,
			data: result.users,
			meta: {
				total: result.total,
				limit: filters.limit ?? 50,
				offset: filters.offset ?? 0,
			},
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get user details
 * GET /api/platform/users/:id
 */
export async function getUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		const user = await platformUserService.getUser(id!);

		res.status(200).json({
			success: true,
			data: user,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Update user
 * PATCH /api/platform/users/:id
 */
export async function updateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = UpdateUserSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		await platformUserService.updateUser(id!, parseResult.data);

		await logPlatformAction(req, "update_user", "user", id!, parseResult.data);

		res.status(200).json({
			success: true,
			message: "User updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Ban user
 * POST /api/platform/users/:id/ban
 */
export async function banUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const parseResult = BanUserSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request body", {
				body: parseResult.error.issues.map((e: z.ZodIssue) => e.message),
			});
		}

		await platformUserService.banUser(
			id!,
			parseResult.data.reason,
			parseResult.data.expiresAt
				? new Date(parseResult.data.expiresAt)
				: undefined,
		);

		await logPlatformAction(req, "ban_user", "user", id!, {
			reason: parseResult.data.reason,
			expiresAt: parseResult.data.expiresAt,
		});

		res.status(200).json({
			success: true,
			message: "User banned successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Unban user
 * POST /api/platform/users/:id/unban
 */
export async function unbanUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		await platformUserService.unbanUser(id!);

		await logPlatformAction(req, "unban_user", "user", id!);

		res.status(200).json({
			success: true,
			message: "User unbanned successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Delete user
 * DELETE /api/platform/users/:id
 */
export async function deleteUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		await platformUserService.deleteUser(id!);

		await logPlatformAction(req, "delete_user", "user", id!);

		res.status(200).json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Create impersonation session
 * POST /api/platform/users/:id/impersonate
 */
export async function impersonateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const adminId = req.platformUser!.id;

		const session = await platformUserService.createImpersonationSession(
			id!,
			adminId,
		);

		await logPlatformAction(req, "impersonate_user", "user", id!, {
			sessionExpiresAt: session.expiresAt.toISOString(),
		});

		res.status(200).json({
			success: true,
			data: session,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get user activity log
 * GET /api/platform/users/:id/activity
 */
export async function getUserActivity(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const limit = req.query.limit ? Number(req.query.limit) : 50;

		const activity = await platformUserService.getUserActivityLog(id!, limit);

		res.status(200).json({
			success: true,
			data: activity,
		});
	} catch (error) {
		next(error);
	}
}
