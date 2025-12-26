// ============================================
// PLATFORM ORGANIZATION SERVICE
// ============================================

import { NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";

export interface OrgListFilters {
	search?: string;
	status?: "all" | "active" | "suspended";
	planId?: string;
	hasActiveSubscription?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	limit?: number;
	offset?: number;
	sortBy?: "createdAt" | "name" | "memberCount";
	sortOrder?: "asc" | "desc";
}

export interface OrgDetails {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	createdAt: Date;
	updatedAt: Date;
	ownerId: string;
	owner: {
		id: string;
		email: string;
		name: string | null;
	};
	subscription: {
		id: string;
		status: string;
		planId: string;
		planName: string;
		currentPeriodStart: Date;
		currentPeriodEnd: Date;
	} | null;
	members: Array<{
		id: string;
		userId: string;
		email: string;
		name: string | null;
		role: string;
		joinedAt: Date;
	}>;
	stats: {
		memberCount: number;
		projectCount: number;
		taskCount: number;
		completedTaskCount: number;
		aiCreditsUsed: number;
		aiCreditsRemaining: number;
	};
}

export interface OrgUpdate {
	name?: string;
	slug?: string;
	suspended?: boolean;
	suspendedReason?: string;
}

export class PlatformOrgService {
	/**
	 * List all organizations with filters
	 */
	async listOrganizations(filters: OrgListFilters = {}): Promise<{
		organizations: Array<{
			id: string;
			name: string;
			slug: string;
			logo: string | null;
			memberCount: number;
			planName: string | null;
			subscriptionStatus: string | null;
			createdAt: Date;
		}>;
		total: number;
	}> {
		const {
			search,
			status = "all",
			planId,
			hasActiveSubscription,
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
				{ name: { contains: search, mode: "insensitive" } },
				{ slug: { contains: search, mode: "insensitive" } },
			];
		}

		if (status === "active") {
			where.suspended = false;
		} else if (status === "suspended") {
			where.suspended = true;
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

		if (planId) {
			where.subscription = { planId };
		}

		if (hasActiveSubscription !== undefined) {
			if (hasActiveSubscription) {
				where.subscription = { status: "ACTIVE" };
			} else {
				where.subscription = null;
			}
		}

		// Build orderBy based on sortBy
		let orderBy: Record<string, string> | Array<Record<string, unknown>> = {
			[sortBy]: sortOrder,
		};
		if (sortBy === "memberCount") {
			orderBy = { memberships: { _count: sortOrder } };
		}

		const [organizations, total] = await Promise.all([
			db.organization.findMany({
				where,
				orderBy,
				take: limit,
				skip: offset,
				include: {
					_count: {
						select: { memberships: true },
					},
					subscription: {
						include: {
							plan: {
								select: { name: true },
							},
						},
					},
				},
			}),
			db.organization.count({ where }),
		]);

		return {
			organizations: organizations.map((o) => ({
				id: o.id,
				name: o.name,
				slug: o.slug,
				logo: o.logo,
				memberCount: o._count.memberships,
				planName: o.subscription?.plan?.name ?? null,
				subscriptionStatus: o.subscription?.status ?? null,
				createdAt: o.createdAt,
			})),
			total,
		};
	}

	/**
	 * Get detailed organization information
	 */
	async getOrganization(orgId: string): Promise<OrgDetails> {
		const org = await db.organization.findUnique({
			where: { id: orgId },
			include: {
				owner: {
					select: { id: true, email: true, name: true },
				},
				memberships: {
					include: {
						user: {
							select: { id: true, email: true, name: true },
						},
						role: {
							select: { name: true },
						},
					},
				},
				subscription: {
					include: {
						plan: {
							select: { id: true, name: true },
						},
					},
				},
			},
		});

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		// Get organization stats
		const [projectCount, taskCount, completedTaskCount, usageRecord] =
			await Promise.all([
				db.project.count({ where: { organizationId: orgId } }),
				db.taskNode.count({
					where: { project: { organizationId: orgId } },
				}),
				db.taskNode.count({
					where: { project: { organizationId: orgId }, status: "COMPLETED" },
				}),
				db.usageRecord.findFirst({
					where: {
						organizationId: orgId,
						periodStart: { lte: new Date() },
						periodEnd: { gte: new Date() },
					},
					orderBy: { periodEnd: "desc" },
				}),
			]);

		return {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			createdAt: org.createdAt,
			updatedAt: org.updatedAt,
			ownerId: org.ownerId,
			owner: org.owner,
			subscription: org.subscription
				? {
						id: org.subscription.id,
						status: org.subscription.status,
						planId: org.subscription.plan.id,
						planName: org.subscription.plan.name,
						currentPeriodStart: org.subscription.currentPeriodStart,
						currentPeriodEnd: org.subscription.currentPeriodEnd,
					}
				: null,
			members: org.memberships.map((m) => ({
				id: m.id,
				userId: m.user.id,
				email: m.user.email,
				name: m.user.name,
				role: m.role.name,
				joinedAt: m.joinedAt,
			})),
			stats: {
				memberCount: org.memberships.length,
				projectCount,
				taskCount,
				completedTaskCount,
				aiCreditsUsed: usageRecord?.aiCreditsUsed ?? 0,
				aiCreditsRemaining:
					(org.subscription?.plan as unknown as { aiCreditsLimit?: number })
						?.aiCreditsLimit ?? 0 - (usageRecord?.aiCreditsUsed ?? 0),
			},
		};
	}

	/**
	 * Update organization details
	 */
	async updateOrganization(orgId: string, updates: OrgUpdate): Promise<void> {
		const org = await db.organization.findUnique({ where: { id: orgId } });

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		// Check slug uniqueness if changing slug
		if (updates.slug && updates.slug !== org.slug) {
			const existing = await db.organization.findUnique({
				where: { slug: updates.slug },
			});
			if (existing) {
				throw new Error("Slug already in use");
			}
		}

		await db.organization.update({
			where: { id: orgId },
			data: updates,
		});
	}

	/**
	 * Suspend an organization
	 */
	async suspendOrganization(orgId: string, reason: string): Promise<void> {
		const org = await db.organization.findUnique({ where: { id: orgId } });

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		await db.organization.update({
			where: { id: orgId },
			data: {
				suspended: true,
				suspendedReason: reason,
				suspendedAt: new Date(),
			},
		});

		// Cancel subscription if active
		if (org.subscriptionId) {
			await db.subscription.update({
				where: { id: org.subscriptionId },
				data: { status: "CANCELLED" },
			});
		}
	}

	/**
	 * Unsuspend an organization
	 */
	async unsuspendOrganization(orgId: string): Promise<void> {
		const org = await db.organization.findUnique({ where: { id: orgId } });

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		await db.organization.update({
			where: { id: orgId },
			data: {
				suspended: false,
				suspendedReason: null,
				suspendedAt: null,
			},
		});
	}

	/**
	 * Delete an organization and all its data
	 */
	async deleteOrganization(orgId: string): Promise<void> {
		const org = await db.organization.findUnique({ where: { id: orgId } });

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		// Delete organization (cascades will handle related data)
		await db.organization.delete({ where: { id: orgId } });
	}

	/**
	 * Transfer organization ownership
	 */
	async transferOwnership(orgId: string, newOwnerId: string): Promise<void> {
		const [org, newOwner] = await Promise.all([
			db.organization.findUnique({ where: { id: orgId } }),
			db.user.findUnique({ where: { id: newOwnerId } }),
		]);

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		if (!newOwner) {
			throw new NotFoundError("User", newOwnerId);
		}

		// Check if new owner is a member
		const membership = await db.membership.findFirst({
			where: { organizationId: orgId, userId: newOwnerId },
		});

		if (!membership) {
			throw new Error("New owner must be a member of the organization");
		}

		// Get owner role
		const ownerRole = await db.role.findFirst({
			where: { organizationId: orgId, name: "Owner" },
		});

		await db.$transaction([
			// Update organization owner
			db.organization.update({
				where: { id: orgId },
				data: { ownerId: newOwnerId },
			}),
			// Update new owner's role to Owner
			...(ownerRole
				? [
						db.membership.update({
							where: { id: membership.id },
							data: { roleId: ownerRole.id },
						}),
					]
				: []),
		]);
	}

	/**
	 * Get organization audit log
	 */
	async getOrganizationAuditLog(
		orgId: string,
		limit = 50,
	): Promise<
		Array<{
			action: string;
			resourceType: string;
			resourceId: string | null;
			userId: string | null;
			userName: string | null;
			timestamp: Date;
			metadata: unknown;
		}>
	> {
		const logs = await db.auditLog.findMany({
			where: { organizationId: orgId },
			orderBy: { timestamp: "desc" },
			take: limit,
			include: {
				user: {
					select: { name: true },
				},
			},
		});

		return logs.map((l) => ({
			action: l.action,
			resourceType: l.resourceType,
			resourceId: l.resourceId,
			userId: l.userId,
			userName: l.user?.name ?? null,
			timestamp: l.timestamp,
			metadata: l.metadata,
		}));
	}

	/**
	 * Manually adjust subscription for an organization
	 */
	async adjustSubscription(
		orgId: string,
		planId: string,
		options: {
			startDate?: Date;
			endDate?: Date;
			notes?: string;
		} = {},
	): Promise<void> {
		const [org, plan] = await Promise.all([
			db.organization.findUnique({ where: { id: orgId } }),
			db.plan.findUnique({ where: { id: planId } }),
		]);

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		if (!plan) {
			throw new NotFoundError("Plan", planId);
		}

		const now = new Date();
		const endDate =
			options.endDate ??
			new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

		if (org.subscriptionId) {
			// Update existing subscription
			await db.subscription.update({
				where: { id: org.subscriptionId },
				data: {
					planId,
					status: "ACTIVE",
					currentPeriodStart: options.startDate ?? now,
					currentPeriodEnd: endDate,
				},
			});
		} else {
			// Create new subscription
			const subscription = await db.subscription.create({
				data: {
					organizationId: orgId,
					planId,
					status: "ACTIVE",
					currentPeriodStart: options.startDate ?? now,
					currentPeriodEnd: endDate,
				},
			});

			await db.organization.update({
				where: { id: orgId },
				data: { subscriptionId: subscription.id },
			});
		}
	}
}

// Singleton instance
export const platformOrgService = new PlatformOrgService();
