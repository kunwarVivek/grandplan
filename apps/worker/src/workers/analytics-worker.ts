// ============================================
// ANALYTICS WORKER - Metric aggregation jobs
// ============================================

import { db } from "@grandplan/db";
import {
	type AnalyticsJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import {
	AnalyticsJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

export function registerAnalyticsWorker(): void {
	queueManager.registerWorker<AnalyticsJobData, JobResult>(
		"analytics",
		async (job: Job<AnalyticsJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				AnalyticsJobSchema,
				job.data,
				job.id,
				"analytics"
			);

			const { metricType, date } = validatedData;

			console.log(`Processing analytics aggregation: ${metricType} for ${date}`);

			try {
				const targetDate = new Date(date);

				// Aggregate metrics based on period type
				const metrics = await aggregateMetrics(targetDate, metricType);

				// Store snapshot
				await db.platformMetricsSnapshot.create({
					data: {
						snapshotDate: targetDate,
						...metrics,
					},
				});

				return {
					success: true,
					message: `${metricType} metrics aggregated for ${date}`,
					data: metrics,
				};
			} catch (error) {
				console.error("Analytics aggregation failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 1, // Run one aggregation at a time
		},
	);

	console.log("Analytics worker registered");
}

async function aggregateMetrics(date: Date, metricType: "daily" | "weekly" | "monthly") {
	const now = new Date();
	const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Determine period bounds based on metric type
	let periodStart: Date;
	const periodEnd = new Date(date);
	periodEnd.setHours(23, 59, 59, 999);

	if (metricType === "daily") {
		periodStart = new Date(date);
		periodStart.setHours(0, 0, 0, 0);
	} else if (metricType === "weekly") {
		periodStart = new Date(date);
		periodStart.setDate(periodStart.getDate() - 7);
	} else {
		periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
	}

	// Aggregate all counts in parallel
	const [
		totalUsers,
		totalOrganizations,
		totalActiveSubscriptions,
		totalTasks,
		totalProjects,
		activeUsersLast24h,
		activeUsersLast7d,
		activeUsersLast30d,
		newUsersToday,
		newOrgsToday,
		churnedOrgsToday,
		aiRequestsToday,
	] = await Promise.all([
		db.user.count({ where: { deletedAt: null } }),
		db.organization.count({ where: { deletedAt: null } }),
		db.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
		db.taskNode.count({ where: { deletedAt: null } }),
		db.project.count({ where: { deletedAt: null } }),
		db.user.count({
			where: { deletedAt: null, lastLoginAt: { gte: last24h } },
		}),
		db.user.count({
			where: { deletedAt: null, lastLoginAt: { gte: last7d } },
		}),
		db.user.count({
			where: { deletedAt: null, lastLoginAt: { gte: last30d } },
		}),
		db.user.count({
			where: { createdAt: { gte: periodStart, lte: periodEnd } },
		}),
		db.organization.count({
			where: { createdAt: { gte: periodStart, lte: periodEnd } },
		}),
		db.subscription.count({
			where: {
				status: "CANCELLED",
				cancelledAt: { gte: periodStart, lte: periodEnd },
			},
		}),
		db.taskAIDecision.count({
			where: { createdAt: { gte: periodStart, lte: periodEnd } },
		}),
	]);

	// Calculate MRR from active subscriptions
	const subscriptions = await db.subscription.findMany({
		where: { status: { in: ["ACTIVE", "TRIALING"] } },
		include: { plan: true },
	});

	let mrr = 0;
	for (const sub of subscriptions) {
		// Use monthly price, or yearly price divided by 12
		const monthlyPrice = sub.billingCycle === "YEARLY" && sub.plan.priceYearly
			? Number(sub.plan.priceYearly) / 12
			: sub.plan.priceMonthly
			? Number(sub.plan.priceMonthly)
			: 0;
		mrr += monthlyPrice;
	}

	// Calculate AI tokens used today
	const aiTokensResult = await db.taskAIDecision.aggregate({
		where: { createdAt: { gte: periodStart, lte: periodEnd } },
		_sum: { tokensUsed: true },
	});

	return {
		totalUsers,
		totalOrganizations,
		totalActiveSubscriptions,
		totalTasks,
		totalProjects,
		activeUsersLast24h,
		activeUsersLast7d,
		activeUsersLast30d,
		newUsersToday,
		newOrgsToday,
		churnedOrgsToday,
		aiRequestsToday,
		aiTokensUsedToday: aiTokensResult._sum.tokensUsed ?? 0,
		mrr,
		arr: mrr * 12,
	};
}
