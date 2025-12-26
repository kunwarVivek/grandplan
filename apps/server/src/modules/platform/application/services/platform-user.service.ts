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
	banned: boolean;
	banReason: string | null;
	banExpires: Date | null;
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

export interface UserUpdate {
	name?: string;
	email?: string;
	banned?: boolean;
	banReason?: string;
	banExpires?: Date | null;
}

export class PlatformUserService {
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
			banned: boolean;
			organizationCount: number;
			createdAt: Date;
		}>;
		total: number;
	}> {
		const {
			search,
			status = "all",
			hasOrganization,
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

		if (status === "active") {
			where.banned = false;
		} else if (status === "banned") {
			where.banned = true;
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

		if (hasOrganization !== undefined) {
			if (hasOrganization) {
				where.memberships = { some: {} };
			} else {
				where.memberships = { none: {} };
			}
		}

		const [users, total] = await Promise.all([
			db.user.findMany({
				where,
				orderBy: { [sortBy]: sortOrder },
				take: limit,
				skip: offset,
				include: {
					_count: {
						select: { memberships: true },
					},
				},
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
				banned: u.banned ?? false,
				organizationCount: u._count.memberships,
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
			include: {
				memberships: {
					include: {
						organization: {
							select: { id: true, name: true },
						},
						role: {
							select: { name: true },
						},
					},
				},
			},
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
			banned: user.banned ?? false,
			banReason: user.banReason ?? null,
			banExpires: user.banExpires ?? null,
			organizations: user.memberships.map((m) => ({
				id: m.organization.id,
				name: m.organization.name,
				role: m.role.name,
				joinedAt: m.joinedAt,
			})),
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
		reason: string,
		expiresAt?: Date,
	): Promise<void> {
		const user = await db.user.findUnique({ where: { id: userId } });

		if (!user) {
			throw new NotFoundError("User", userId);
		}

		await db.user.update({
			where: { id: userId },
			data: {
				banned: true,
				banReason: reason,
				banExpires: expiresAt ?? null,
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
				banned: false,
				banReason: null,
				banExpires: null,
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
			orderBy: { timestamp: "desc" },
			take: limit,
			select: {
				action: true,
				resourceType: true,
				resourceId: true,
				timestamp: true,
				metadata: true,
			},
		});

		return logs;
	}
}

// Singleton instance
export const platformUserService = new PlatformUserService();
