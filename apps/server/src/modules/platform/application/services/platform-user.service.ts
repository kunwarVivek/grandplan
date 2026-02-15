// ============================================
// PLATFORM USER SERVICE
// ============================================

import { ConflictError, NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";

export interface UserListFilters {
	search?: string;
	status?: "all" | "active" | "banned";
	hasOrganization?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	limit?: number;
	offset?: number;
	sortBy?: "createdAt" | "name" | "email";
	sortOrder?: "asc" | "desc";
}

export interface UserDetails {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	status: string;
	organizations: Array<{
		id: string;
		name: string;
		role: string;
		joinedAt: Date;
	}>;
	stats: {
		tasksCreated: number;
		tasksCompleted: number;
		lastActiveAt: Date | null;
	};
}

export interface UserCreate {
	email: string;
	name?: string;
}

export interface UserUpdate {
	name?: string;
	email?: string;
}

export class PlatformUserService {
	/**
	 * Create a new user
	 */
	async createUser(data: UserCreate): Promise<{
		id: string;
		email: string;
		name: string | null;
		createdAt: Date;
	}> {
		// Check if user already exists
		const existing = await db.user.findUnique({
			where: { email: data.email },
		});

		if (existing) {
			throw new ConflictError("User with this email already exists");
		}

		const user = await db.user.create({
			data: {
				id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
				email: data.email,
				name: data.name ?? "",
			},
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
			},
		});

		return user;
	}

	/**
	 * List all users with filters
	 */
	async listUsers(filters: UserListFilters = {}): Promise<{
		users: Array<{
			id: string;
			email: string;
			name: string | null;
			image: string | null;
			emailVerified: boolean;
			status: string;
			organizationCount: number;
			createdAt: Date;
		}>;
		total: number;
	}> {
		const {
			search,
			status: statusFilter = "all",
			createdAfter,
			createdBefore,
			limit = 50,
			offset = 0,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = filters;

		const where: Record<string, unknown> = {};

		if (search) {
			where.OR = [
				{ email: { contains: search, mode: "insensitive" } },
				{ name: { contains: search, mode: "insensitive" } },
			];
		}

		// Filter by status if not "all"
		if (statusFilter === "active") {
			where.status = "ACTIVE";
		} else if (statusFilter === "banned") {
			where.status = "BANNED";
		}

		if (createdAfter) {
			where.createdAt = {
				...((where.createdAt as object) ?? {}),
				gte: createdAfter,
			};
		}

		if (createdBefore) {
			where.createdAt = {
				...((where.createdAt as object) ?? {}),
				lte: createdBefore,
			};
		}

		const [users, total] = await Promise.all([
			db.user.findMany({
				where,
				orderBy: { [sortBy]: sortOrder },
				take: limit,
				skip: offset,
			}),
			db.user.count({ where }),
		]);

		return {
			users: users.map((u) => ({
				id: u.id,
				email: u.email,
				name: u.name,
				image: u.image,
				emailVerified: u.emailVerified,
				status: u.status,
				organizationCount: 0, // Would need separate query to get this
				createdAt: u.createdAt,
			})),
			total,
		};
	}

	/**
	 * Get detailed user information
	 */
	async getUser(userId: string): Promise<UserDetails> {
		const user = await db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		// Get user stats
		const [tasksCreated, tasksCompleted] = await Promise.all([
			db.taskNode.count({ where: { createdById: userId } }),
			db.taskNode.count({
				where: { assigneeId: userId, status: "COMPLETED" },
			}),
		]);

		// Get last activity (most recent task update)
		const lastTask = await db.taskNode.findFirst({
			where: {
				OR: [{ createdById: userId }, { assigneeId: userId }],
			},
			orderBy: { updatedAt: "desc" },
			select: { updatedAt: true },
		});

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			status: user.status,
			organizations: [], // Would need separate query to get memberships
			stats: {
				tasksCreated,
				tasksCompleted,
				lastActiveAt: lastTask?.updatedAt ?? null,
			},
		};
	}

	/**
	 * Update user details
	 */
	async updateUser(userId: string, updates: UserUpdate): Promise<void> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		// Check email uniqueness if changing email
		if (updates.email && updates.email !== user.email) {
			const existing = await db.user.findUnique({
				where: { email: updates.email },
			});
			if (existing) {
				throw new ConflictError("Email already in use");
			}
		}

		await db.user.update({
			where: { id: userId },
			data: updates,
		});
	}

	/**
	 * Ban a user
	 */
	async banUser(
		userId: string,
		_reason: string,
		_expiresAt?: Date,
	): Promise<void> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		await db.user.update({
			where: { id: userId },
			data: {
				status: "SUSPENDED",
			},
		});

		// Invalidate all sessions
		await db.session.deleteMany({ where: { userId } });
	}

	/**
	 * Unban a user
	 */
	async unbanUser(userId: string): Promise<void> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		await db.user.update({
			where: { id: userId },
			data: {
				status: "ACTIVE",
			},
		});
	}

	/**
	 * Delete a user and all their data
	 */
	async deleteUser(userId: string): Promise<void> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		// Delete user (cascades will handle related data)
		await db.user.delete({ where: { id: userId } });
	}

	/**
	 * Impersonate a user (for support purposes)
	 * Returns a session token for the user
	 */
	async createImpersonationSession(
		userId: string,
		adminId: string,
	): Promise<{ sessionToken: string; expiresAt: Date }> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		// Create a short-lived session
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

		const session = await db.session.create({
			data: {
				id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
				userId,
				token: `imp_${adminId}_${Date.now()}_${Math.random().toString(36)}`,
				expiresAt,
				ipAddress: "impersonation",
				userAgent: `Impersonated by admin ${adminId}`,
			},
		});

		return {
			sessionToken: session.token,
			expiresAt: session.expiresAt,
		};
	}

	/**
	 * Get user activity log
	 */
	async getUserActivityLog(
		userId: string,
		limit = 50,
	): Promise<
	Array<{
		action: string;
		resourceType: string;
		resourceId: string | null;
		timestamp: Date;
		metadata: unknown;
	}>
> {
		const logs = await db.auditLog.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: limit,
			select: {
				action: true,
				organizationId: true,
				userId: true,
				createdAt: true,
				newState: true,
				description: true,
			},
		});

		return logs.map((log) => ({
			action: log.action,
			resourceType: log.organizationId ? "organization" : "user",
			resourceId: log.organizationId ?? log.userId,
			timestamp: log.createdAt,
			metadata: {
				description: log.description,
				newState: log.newState,
			},
		}));
	}
}

// Singleton instance
export const platformUserService = new PlatformUserService();
