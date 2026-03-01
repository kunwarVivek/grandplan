// ============================================
// PLATFORM ANALYTICS SERVICE
// ============================================

import { db } from "@grandplan/db";

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export interface OverviewMetrics {
	totalUsers: number;
	activeUsers: number;
	newUsersThisPeriod: number;
	userGrowthPercent: number;
	totalOrganizations: number;
	activeOrganizations: number;
	newOrgsThisPeriod: number;
	orgGrowthPercent: number;
	totalProjects: number;
	totalTasks: number;
	completedTasks: number;
	taskCompletionRate: number;
	totalAICreditsUsed: number;
	aiCreditsUsedThisPeriod: number;
}

export interface RevenueMetrics {
	mrr: number;
	arr: number;
	mrrGrowthPercent: number;
	totalRevenue: number;
	revenueThisPeriod: number;
	revenueGrowthPercent: number;
	averageRevenuePerUser: number;
	customerLifetimeValue: number;
	churnRate: number;
	subscriptionsByPlan: Array<{
		planId: string;
		planName: string;
		count: number;
		revenue: number;
	}>;
	revenueHistory: Array<{
		date: Date;
		revenue: number;
		mrr: number;
	}>;
}

export interface UsageMetrics {
	activeSessionsToday: number;
	averageSessionDuration: number;
	tasksCreatedThisPeriod: number;
	tasksCompletedThisPeriod: number;
	aiRequestsThisPeriod: number;
	topFeatures: Array<{
		feature: string;
		usageCount: number;
	}>;
	usageByOrganization: Array<{
		orgId: string;
		orgName: string;
		aiCreditsUsed: number;
		tasksCreated: number;
		activeUsers: number;
	}>;
	usageHistory: Array<{
		date: Date;
		activeUsers: number;
		tasksCreated: number;
		aiRequests: number;
	}>;
}

export interface GrowthMetrics {
	userSignups: Array<{ date: Date; count: number }>;
	orgCreations: Array<{ date: Date; count: number }>;
	subscriptionActivations: Array<{ date: Date; count: number }>;
	retentionCohorts: Array<{
		cohortMonth: string;
		initialUsers: number;
		retentionByMonth: number[];
	}>;
}

export class PlatformAnalyticsService {
	/**
	 * Get platform overview metrics
	 */
	async getOverviewMetrics(range?: DateRange): Promise<OverviewMetrics> {
		const now = new Date();
		const startDate =
			range?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
		const endDate = range?.endDate ?? now;

		// Previous period for comparison
		const periodLength = endDate.getTime() - startDate.getTime();
		const previousStart = new Date(startDate.getTime() - periodLength);
		const previousEnd = new Date(startDate.getTime() - 1);

		const [
			totalUsers,
			activeUsers,
			newUsersThisPeriod,
			newUsersPreviousPeriod,
			totalOrganizations,
			activeOrganizations,
			newOrgsThisPeriod,
			newOrgsPreviousPeriod,
			totalProjects,
			totalTasks,
			completedTasks,
			aiCreditsUsed,
		] = await Promise.all([
			// Total users
			db.user.count(),
			// Active users (logged in within last 30 days)
			db.session
				.groupBy({
					by: ["userId"],
					where: {
						createdAt: {
							gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
						},
					},
				})
				.then((r) => r.length),
			// New users this period
			db.user.count({
				where: { createdAt: { gte: startDate, lte: endDate } },
			}),
			// New users previous period
			db.user.count({
				where: { createdAt: { gte: previousStart, lte: previousEnd } },
			}),
			// Total organizations
			db.organization.count(),
			// Active organizations (with activity in last 30 days)
			db.auditLog
				.groupBy({
					by: ["organizationId"],
					where: {
						createdAt: {
							gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
						},
						organizationId: { not: null },
					},
				})
				.then((r) => r.length),
			// New orgs this period
			db.organization.count({
				where: { createdAt: { gte: startDate, lte: endDate } },
			}),
			// New orgs previous period
			db.organization.count({
				where: { createdAt: { gte: previousStart, lte: previousEnd } },
			}),
			// Total projects
			db.project.count(),
			// Total tasks
			db.taskNode.count(),
			// Completed tasks
			db.taskNode.count({ where: { status: "COMPLETED" } }),
			// AI credits used this period
			db.usageRecord.aggregate({
				where: {
					metric: "ai_requests",
					periodStart: { gte: startDate },
					periodEnd: { lte: endDate },
				},
				_sum: { quantity: true },
			}),
		]);

		const userGrowthPercent =
			newUsersPreviousPeriod > 0
				? ((newUsersThisPeriod - newUsersPreviousPeriod) /
						newUsersPreviousPeriod) *
					100
				: newUsersThisPeriod > 0
					? 100
					: 0;

		const orgGrowthPercent =
			newOrgsPreviousPeriod > 0
				? ((newOrgsThisPeriod - newOrgsPreviousPeriod) /
						newOrgsPreviousPeriod) *
					100
				: newOrgsThisPeriod > 0
					? 100
					: 0;

		// Get total AI credits used ever
		const totalAICreditsResult = await db.usageRecord.aggregate({
			where: { metric: "ai_requests" },
			_sum: { quantity: true },
		});

		return {
			totalUsers,
			activeUsers,
			newUsersThisPeriod,
			userGrowthPercent,
			totalOrganizations,
			activeOrganizations,
			newOrgsThisPeriod,
			orgGrowthPercent,
			totalProjects,
			totalTasks,
			completedTasks,
			taskCompletionRate:
				totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
			totalAICreditsUsed: Number(totalAICreditsResult._sum.quantity ?? 0),
			aiCreditsUsedThisPeriod: Number(aiCreditsUsed._sum.quantity ?? 0),
		};
	}

	/**
	 * Get revenue metrics
	 */
	async getRevenueMetrics(range?: DateRange): Promise<RevenueMetrics> {
		const now = new Date();
		const startDate =
			range?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
		const endDate = range?.endDate ?? now;

		// Previous period for comparison
		const periodLength = endDate.getTime() - startDate.getTime();
		const previousStart = new Date(startDate.getTime() - periodLength);
		const previousEnd = new Date(startDate.getTime() - 1);

		// Get active subscriptions with their plans
		const activeSubscriptions = await db.subscription.findMany({
			where: { status: "ACTIVE" },
			include: {
				plan: {
					select: { id: true, name: true, priceMonthly: true },
				},
			},
		});

		// Calculate MRR
		const mrr = activeSubscriptions.reduce(
			(sum, sub) => sum + Number(sub.plan.priceMonthly ?? 0),
			0,
		);
		const arr = mrr * 12;

		// Get invoices for revenue calculations
		const [invoicesThisPeriod, invoicesPreviousPeriod, allInvoices] =
			await Promise.all([
				db.invoice.findMany({
					where: {
						status: "PAID",
						paidAt: { gte: startDate, lte: endDate },
					},
				}),
				db.invoice.findMany({
					where: {
						status: "PAID",
						paidAt: { gte: previousStart, lte: previousEnd },
					},
				}),
				db.invoice.findMany({
					where: { status: "PAID" },
				}),
			]);

		const revenueThisPeriod = invoicesThisPeriod.reduce(
			(sum, inv) => sum + Number(inv.amount),
			0,
		);
		const revenuePreviousPeriod = invoicesPreviousPeriod.reduce(
			(sum, inv) => sum + Number(inv.amount),
			0,
		);
		const totalRevenue = allInvoices.reduce(
			(sum, inv) => sum + Number(inv.amount),
			0,
		);

		const revenueGrowthPercent =
			revenuePreviousPeriod > 0
				? ((revenueThisPeriod - revenuePreviousPeriod) /
						revenuePreviousPeriod) *
					100
				: revenueThisPeriod > 0
					? 100
					: 0;

		// Calculate previous MRR for growth
		const previousMonthStart = new Date(
			now.getFullYear(),
			now.getMonth() - 1,
			1,
		);
		const previousMRRSubs = await db.subscription.count({
			where: {
				status: "ACTIVE",
				createdAt: { lte: previousMonthStart },
			},
		});

		// Subscriptions by plan
		const subscriptionsByPlan = await db.subscription.groupBy({
			by: ["planId"],
			where: { status: "ACTIVE" },
			_count: true,
		});

		const planDetails = await db.plan.findMany({
			where: { id: { in: subscriptionsByPlan.map((s) => s.planId) } },
			select: { id: true, name: true, priceMonthly: true },
		});

		const planMap = new Map(planDetails.map((p) => [p.id, p]));

		// Churned subscriptions this period
		const churnedCount = await db.subscription.count({
			where: {
				status: "CANCELLED",
				cancelledAt: { gte: startDate, lte: endDate },
			},
		});

		const totalActiveAtStart = await db.subscription.count({
			where: {
				status: "ACTIVE",
				createdAt: { lte: startDate },
			},
		});

		const churnRate =
			totalActiveAtStart > 0 ? (churnedCount / totalActiveAtStart) * 100 : 0;

		// Revenue history (last 12 months)
		const revenueHistory: Array<{ date: Date; revenue: number; mrr: number }> =
			[];
		for (let i = 11; i >= 0; i--) {
			const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

			const monthInvoices = allInvoices.filter(
				(inv) =>
					inv.paidAt && inv.paidAt >= monthStart && inv.paidAt <= monthEnd,
			);

			const monthRevenue = monthInvoices.reduce(
				(sum, inv) => sum + Number(inv.amount),
				0,
			);

			revenueHistory.push({
				date: monthStart,
				revenue: monthRevenue,
				mrr: mrr, // Simplified - would need historical MRR tracking for accuracy
			});
		}

		const totalUsers = await db.user.count();

		return {
			mrr,
			arr,
			mrrGrowthPercent:
				previousMRRSubs > 0
					? ((activeSubscriptions.length - previousMRRSubs) / previousMRRSubs) *
						100
					: 0,
			totalRevenue,
			revenueThisPeriod,
			revenueGrowthPercent,
			averageRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
			customerLifetimeValue: churnRate > 0 ? mrr / (churnRate / 100) : mrr * 24, // Estimate 2 years if no churn
			churnRate,
			subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
				planId: s.planId,
				planName: planMap.get(s.planId)?.name ?? "Unknown",
				count: s._count,
				revenue: Number(planMap.get(s.planId)?.priceMonthly ?? 0) * s._count,
			})),
			revenueHistory,
		};
	}

	/**
	 * Get usage metrics
	 */
	async getUsageMetrics(range?: DateRange): Promise<UsageMetrics> {
		const now = new Date();
		const startDate =
			range?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
		const endDate = range?.endDate ?? now;
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);

		const [
			activeSessionsToday,
			tasksCreatedThisPeriod,
			tasksCompletedThisPeriod,
			aiDecisionsThisPeriod,
			topOrganizations,
		] = await Promise.all([
			// Active sessions today
			db.session.count({
				where: {
					createdAt: { gte: todayStart },
					expiresAt: { gt: now },
				},
			}),
			// Tasks created this period
			db.taskNode.count({
				where: { createdAt: { gte: startDate, lte: endDate } },
			}),
			// Tasks completed this period
			db.taskNode.count({
				where: {
					status: "COMPLETED",
					updatedAt: { gte: startDate, lte: endDate },
				},
			}),
			// AI decisions this period
			db.taskAIDecision.count({
				where: { createdAt: { gte: startDate, lte: endDate } },
			}),
			// Top subscriptions by AI usage (group by subscriptionId)
			db.usageRecord.groupBy({
				by: ["subscriptionId"],
				where: {
					metric: "ai_requests",
					periodStart: { gte: startDate },
					periodEnd: { lte: endDate },
				},
				_sum: { quantity: true },
				orderBy: { _sum: { quantity: "desc" } },
				take: 10,
			}),
		]);

		// Get organization details via subscriptions
		const subscriptionIds = topOrganizations.map((o) => o.subscriptionId);
		const subscriptions = await db.subscription.findMany({
			where: { id: { in: subscriptionIds } },
			select: { id: true, organizationId: true },
		});
		const subOrgMap = new Map(
			subscriptions.map((s) => [s.id, s.organizationId]),
		);

		const orgIds = [
			...new Set(subscriptions.map((s) => s.organizationId).filter(Boolean)),
		];
		const orgDetails = await db.organization.findMany({
			where: { id: { in: orgIds } },
			select: { id: true, name: true },
		});
		const orgMap = new Map(orgDetails.map((o) => [o.id, o.name]));

		// Get additional stats per organization
		const usageByOrganization = await Promise.all(
			topOrganizations.map(async (o) => {
				const orgId = subOrgMap.get(o.subscriptionId);
				const [tasksCreated, activeUsers] = await Promise.all([
					db.taskNode.count({
						where: {
							project: { workspace: { organizationId: orgId ?? "" } },
							createdAt: { gte: startDate, lte: endDate },
						},
					}),
					db.auditLog
						.groupBy({
							by: ["userId"],
							where: {
								organizationId: orgId,
								createdAt: { gte: startDate, lte: endDate },
							},
						})
						.then((r) => r.length),
				]);

				return {
					orgId: orgId ?? "",
					orgName: orgMap.get(orgId ?? "") ?? "Unknown",
					aiCreditsUsed: Number(o._sum.quantity ?? 0),
					tasksCreated,
					activeUsers,
				};
			}),
		);

		// Top features (from audit log)
		const topFeatures = await db.auditLog.groupBy({
			by: ["action"],
			where: { createdAt: { gte: startDate, lte: endDate } },
			_count: { action: true },
			orderBy: { _count: { action: "desc" } },
			take: 10,
		});

		// Usage history (last 30 days)
		const usageHistory: Array<{
			date: Date;
			activeUsers: number;
			tasksCreated: number;
			aiRequests: number;
		}> = [];

		for (let i = 29; i >= 0; i--) {
			const dayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - i,
			);
			const dayEnd = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - i + 1,
			);

			const [activeUsers, tasksCreated, aiRequests] = await Promise.all([
				db.session
					.groupBy({
						by: ["userId"],
						where: { createdAt: { gte: dayStart, lt: dayEnd } },
					})
					.then((r) => r.length),
				db.taskNode.count({
					where: { createdAt: { gte: dayStart, lt: dayEnd } },
				}),
				db.taskAIDecision.count({
					where: { createdAt: { gte: dayStart, lt: dayEnd } },
				}),
			]);

			usageHistory.push({
				date: dayStart,
				activeUsers,
				tasksCreated,
				aiRequests,
			});
		}

		return {
			activeSessionsToday,
			averageSessionDuration: 0, // Would need session duration tracking
			tasksCreatedThisPeriod,
			tasksCompletedThisPeriod,
			aiRequestsThisPeriod: aiDecisionsThisPeriod,
			topFeatures: topFeatures.map((f) => ({
				feature: f.action,
				usageCount: f._count.action,
			})),
			usageByOrganization,
			usageHistory,
		};
	}

	/**
	 * Get growth metrics
	 */
	async getGrowthMetrics(range?: DateRange): Promise<GrowthMetrics> {
		const now = new Date();
		const startDate =
			range?.startDate ?? new Date(now.getFullYear() - 1, now.getMonth(), 1);
		const endDate = range?.endDate ?? now;

		// Generate daily data for the range
		const days: Date[] = [];
		const current = new Date(startDate);
		while (current <= endDate) {
			days.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}

		// User signups
		const userSignups = await db.user.groupBy({
			by: ["createdAt"],
			where: { createdAt: { gte: startDate, lte: endDate } },
			_count: { id: true },
		});

		// Group by day
		const signupsByDay = new Map<string, number>();
		userSignups.forEach((s) => {
			const day = s.createdAt.toISOString().split("T")[0] ?? "";
			signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + s._count.id);
		});

		// Org creations
		const orgCreations = await db.organization.groupBy({
			by: ["createdAt"],
			where: { createdAt: { gte: startDate, lte: endDate } },
			_count: { id: true },
		});

		const orgsByDay = new Map<string, number>();
		orgCreations.forEach((o) => {
			const day = o.createdAt.toISOString().split("T")[0] ?? "";
			orgsByDay.set(day, (orgsByDay.get(day) ?? 0) + o._count.id);
		});

		// Subscription activations
		const subscriptionActivations = await db.subscription.groupBy({
			by: ["createdAt"],
			where: {
				status: "ACTIVE",
				createdAt: { gte: startDate, lte: endDate },
			},
			_count: { id: true },
		});

		const subsByDay = new Map<string, number>();
		subscriptionActivations.forEach((s) => {
			const day = s.createdAt.toISOString().split("T")[0] ?? "";
			subsByDay.set(day, (subsByDay.get(day) ?? 0) + s._count.id);
		});

		// Build retention cohorts (last 6 months)
		const retentionCohorts: Array<{
			cohortMonth: string;
			initialUsers: number;
			retentionByMonth: number[];
		}> = [];

		for (let i = 5; i >= 0; i--) {
			const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
			const cohortMonth = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, "0")}`;

			// Users who signed up in this cohort
			const cohortUsers = await db.user.findMany({
				where: { createdAt: { gte: cohortStart, lte: cohortEnd } },
				select: { id: true },
			});

			const initialUsers = cohortUsers.length;
			const retentionByMonth: number[] = [];

			// Calculate retention for each subsequent month
			for (let m = 1; m <= Math.min(i, 6); m++) {
				const checkStart = new Date(
					cohortStart.getFullYear(),
					cohortStart.getMonth() + m,
					1,
				);
				const checkEnd = new Date(
					cohortStart.getFullYear(),
					cohortStart.getMonth() + m + 1,
					0,
				);

				const activeCount = await db.session
					.groupBy({
						by: ["userId"],
						where: {
							userId: { in: cohortUsers.map((u) => u.id) },
							createdAt: { gte: checkStart, lte: checkEnd },
						},
					})
					.then((r) => r.length);

				retentionByMonth.push(
					initialUsers > 0 ? Math.round((activeCount / initialUsers) * 100) : 0,
				);
			}

			retentionCohorts.push({
				cohortMonth,
				initialUsers,
				retentionByMonth,
			});
		}

		return {
			userSignups: days.map((d) => ({
				date: d,
				count: signupsByDay.get(d.toISOString().split("T")[0] ?? "") ?? 0,
			})),
			orgCreations: days.map((d) => ({
				date: d,
				count: orgsByDay.get(d.toISOString().split("T")[0] ?? "") ?? 0,
			})),
			subscriptionActivations: days.map((d) => ({
				date: d,
				count: subsByDay.get(d.toISOString().split("T")[0] ?? "") ?? 0,
			})),
			retentionCohorts,
		};
	}

	/**
	 * Export analytics data as CSV
	 */
	async exportAnalytics(
		type: "users" | "organizations" | "revenue" | "usage",
		range?: DateRange,
	): Promise<string> {
		const startDate =
			range?.startDate ?? new Date(new Date().getFullYear(), 0, 1);
		const endDate = range?.endDate ?? new Date();

		let csvContent = "";

		switch (type) {
			case "users": {
				const users = await db.user.findMany({
					where: { createdAt: { gte: startDate, lte: endDate } },
					select: {
						id: true,
						email: true,
						name: true,
						createdAt: true,
						emailVerified: true,
					},
					orderBy: { createdAt: "desc" },
				});

				csvContent = "ID,Email,Name,Created At,Email Verified\n";
				users.forEach((u) => {
					csvContent += `${u.id},"${u.email}","${u.name ?? ""}",${u.createdAt.toISOString()},${u.emailVerified}\n`;
				});
				break;
			}

			case "organizations": {
				const orgs = await db.organization.findMany({
					where: { createdAt: { gte: startDate, lte: endDate } },
					select: {
						id: true,
						name: true,
						slug: true,
						createdAt: true,
						_count: { select: { members: true } },
					},
					orderBy: { createdAt: "desc" },
				});

				csvContent = "ID,Name,Slug,Created At,Member Count\n";
				orgs.forEach((o) => {
					csvContent += `${o.id},"${o.name}","${o.slug}",${o.createdAt.toISOString()},${o._count.members}\n`;
				});
				break;
			}

			case "revenue": {
				const invoices = await db.invoice.findMany({
					where: {
						status: "PAID",
						paidAt: { gte: startDate, lte: endDate },
					},
					include: {
						subscription: { select: { organizationId: true } },
					},
					orderBy: { paidAt: "desc" },
				});

				const subIds = invoices
					.map((i) => i.subscription.organizationId)
					.filter(Boolean);
				const subs = await db.subscription.findMany({
					where: { id: { in: subIds } },
					select: { id: true, organizationId: true },
				});
				const orgIds = [
					...new Set(subs.map((s) => s.organizationId).filter(Boolean)),
				];
				const orgs = await db.organization.findMany({
					where: { id: { in: orgIds } },
					select: { id: true, name: true },
				});
				const orgMap = new Map(orgs.map((o) => [o.id, o.name]));
				const subOrgMap = new Map(subs.map((s) => [s.id, s.organizationId]));

				csvContent = "ID,Organization,Amount,Currency,Paid At\n";
				invoices.forEach((i) => {
					const orgId = subOrgMap.get(i.subscription.organizationId);
					csvContent += `${i.id},"${orgMap.get(orgId ?? "") ?? "N/A"}",${Number(i.amount)},${i.currency},${i.paidAt?.toISOString() ?? ""}\n`;
				});
				break;
			}

			case "usage": {
				const usage = await db.usageRecord.findMany({
					where: {
						periodStart: { gte: startDate },
						periodEnd: { lte: endDate },
					},
					orderBy: { periodStart: "desc" },
				});

				const subIds = usage.map((u) => u.subscriptionId);
				const subs = await db.subscription.findMany({
					where: { id: { in: subIds } },
					select: { id: true, organizationId: true },
				});
				const orgIds = [
					...new Set(subs.map((s) => s.organizationId).filter(Boolean)),
				];
				const orgs = await db.organization.findMany({
					where: { id: { in: orgIds } },
					select: { id: true, name: true },
				});
				const orgMap = new Map(orgs.map((o) => [o.id, o.name]));
				const subOrgMap = new Map(subs.map((s) => [s.id, s.organizationId]));

				csvContent = "Organization,Period Start,Period End,Metric,Quantity\n";
				usage.forEach((u) => {
					const orgId = subOrgMap.get(u.subscriptionId);
					csvContent += `"${orgMap.get(orgId ?? "") ?? "N/A"}",${u.periodStart.toISOString()},${u.periodEnd.toISOString()},${u.metric},${Number(u.quantity)}\n`;
				});
				break;
			}
		}

		return csvContent;
	}
}

// Singleton instance
export const platformAnalyticsService = new PlatformAnalyticsService();
