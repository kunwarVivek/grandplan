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
	status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
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
	status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
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
			where.status = "ACTIVE";
		} else if (status === "suspended") {
			where.status = "SUSPENDED";
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
			orderBy = [{ _count: { members: sortOrder } }];
		}

		const [organizations, total] = await Promise.all([
			db.organization.findMany({
				where,
				orderBy,
				take: limit,
				skip: offset,
				include: {
					_count: {
						select: { members: true },
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
				memberCount: o._count.members,
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
				members: {
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
							select: { id: true, name: true, maxAIRequestsPerMonth: true },
						},
					},
				},
			},
		});

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		// Get organization stats
		const [projectCount, taskCount, completedTaskCount, usageRecords] =
			await Promise.all([
				db.project.count({ where: { workspace: { organizationId: orgId } } }),
				db.taskNode.count({
					where: { project: { workspace: { organizationId: orgId } } },
				}),
				db.taskNode.count({
					where: {
						project: { workspace: { organizationId: orgId } },
						status: "COMPLETED",
					},
				}),
				db.usageRecord.findMany({
					where: {
						subscription: { organizationId: orgId },
						metric: "ai_requests",
						periodStart: { lte: new Date() },
						periodEnd: { gte: new Date() },
					},
					orderBy: { periodEnd: "desc" },
				}),
			]);

		// Calculate total AI credits used from all usage records
		const aiCreditsUsed = usageRecords.reduce(
			(sum, record) => sum + Number(record.quantity),
			0,
		);
		const aiCreditsLimit = org.subscription?.plan?.maxAIRequestsPerMonth ?? 0;
		const aiCreditsRemaining = aiCreditsLimit - aiCreditsUsed;

		return {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			createdAt: org.createdAt,
			updatedAt: org.updatedAt,
			status: org.status,
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
			members: org.members.map((m) => ({
				id: m.id,
				userId: m.user.id,
				email: m.user.email,
				name: m.user.name,
				role: m.role.name,
				joinedAt: m.joinedAt,
			})),
			stats: {
				memberCount: org.members.length,
				projectCount,
				taskCount,
				completedTaskCount,
				aiCreditsUsed,
				aiCreditsRemaining,
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
	async suspendOrganization(orgId: string, _reason: string): Promise<void> {
		const org = await db.organization.findUnique({
			where: { id: orgId },
			include: { subscription: true },
		});

		if (!org) {
			throw new NotFoundError("Organization", orgId);
		}

		await db.organization.update({
			where: { id: orgId },
			data: {
				status: "SUSPENDED",
			},
		});

		if (org.subscription) {
			await db.subscription.update({
				where: { id: org.subscription.id },
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
				status: "ACTIVE",
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
		const [organization, newOwner] = await Promise.all([
			db.organization.findUnique({
				where: { id: orgId },
				select: { id: true, ownerId: true },
			}),
			db.organizationMember.findUnique({
				where: {
					userId_organizationId: {
						userId: newOwnerId,
						organizationId: orgId,
					},
				},
			}),
		]);

		if (!organization) {
			throw new NotFoundError("Organization", orgId);
		}

		if (!newOwner) {
			throw new NotFoundError(
				`User ${newOwnerId} is not a member of this organization`,
			);
		}

		// Update the owner
		await db.organization.update({
			where: { id: orgId },
			data: { ownerId: newOwnerId },
		});
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
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		return logs.map((l) => ({
			action: l.action,
			resourceType: l.resourceType,
			resourceId: l.resourceId,
			userId: l.userId,
			userName: null,
			timestamp: l.createdAt,
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
			db.organization.findUnique({
				where: { id: orgId },
				include: { subscription: true },
			}),
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

		if (org.subscription) {
			// Update existing subscription
			await db.subscription.update({
				where: { id: org.subscription.id },
				data: {
					planId,
					status: "ACTIVE",
					currentPeriodStart: options.startDate ?? now,
					currentPeriodEnd: endDate,
				},
			});
		} else {
			// Create new subscription
			await db.subscription.create({
				data: {
					organizationId: orgId,
					planId,
					status: "ACTIVE",
					currentPeriodStart: options.startDate ?? now,
					currentPeriodEnd: endDate,
				},
			});
		}
	}
}

// Singleton instance
export const platformOrgService = new PlatformOrgService();
