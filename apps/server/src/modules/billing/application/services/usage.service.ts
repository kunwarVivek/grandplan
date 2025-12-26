// ============================================
// USAGE SERVICE - Track and report usage metrics
// ============================================

import { NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";

export interface UsageSummary {
	period: {
		start: Date;
		end: Date;
	};
	metrics: {
		seats: {
			used: number;
			limit: number | null;
			percentUsed: number | null;
		};
		storage: {
			usedGB: number;
			limitGB: number | null;
			percentUsed: number | null;
		};
		aiRequests: {
			used: number;
			limit: number | null;
			percentUsed: number | null;
		};
		apiCalls: {
			used: number;
			limit: number | null;
			percentUsed: number | null;
		};
	};
	history: Array<{
		date: string;
		metric: string;
		value: number;
	}>;
}

export interface UsageRecord {
	metric: string;
	quantity: number;
	recordedAt: Date;
	metadata?: Record<string, unknown>;
}

export class UsageService {
	/**
	 * Get usage summary for an organization
	 */
	async getUsageSummary(organizationId: string): Promise<UsageSummary> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) {
			throw new NotFoundError("Subscription", organizationId);
		}

		// Get usage records for the current period
		const usageRecords = await db.usageRecord.findMany({
			where: {
				subscriptionId: subscription.id,
				periodStart: { gte: subscription.currentPeriodStart },
				periodEnd: { lte: subscription.currentPeriodEnd },
			},
			orderBy: { recordedAt: "asc" },
		});

		// Aggregate by metric
		const metricTotals: Record<string, number> = {};
		for (const record of usageRecords) {
			metricTotals[record.metric] =
				(metricTotals[record.metric] ?? 0) + Number(record.quantity);
		}

		// Build history for last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const dailyRecords = await db.usageRecord.findMany({
			where: {
				subscriptionId: subscription.id,
				recordedAt: { gte: thirtyDaysAgo },
			},
			orderBy: { recordedAt: "asc" },
		});

		// Group by date and metric
		const history: Map<string, Map<string, number>> = new Map();
		for (const record of dailyRecords) {
			const dateKey = record.recordedAt.toISOString().split("T")[0];
			if (!history.has(dateKey)) {
				history.set(dateKey, new Map());
			}
			const dayMetrics = history.get(dateKey)!;
			dayMetrics.set(
				record.metric,
				(dayMetrics.get(record.metric) ?? 0) + Number(record.quantity),
			);
		}

		const historyArray: Array<{ date: string; metric: string; value: number }> =
			[];
		for (const [date, metrics] of history) {
			for (const [metric, value] of metrics) {
				historyArray.push({ date, metric, value });
			}
		}

		// Calculate percentages
		const calcPercent = (used: number, limit: number | null): number | null => {
			if (limit === null || limit === 0) return null;
			return Math.round((used / limit) * 100);
		};

		return {
			period: {
				start: subscription.currentPeriodStart,
				end: subscription.currentPeriodEnd,
			},
			metrics: {
				seats: {
					used: subscription.usedSeats,
					limit: subscription.plan.maxUsers,
					percentUsed: calcPercent(
						subscription.usedSeats,
						subscription.plan.maxUsers,
					),
				},
				storage: {
					usedGB: Number(subscription.usedStorageGB),
					limitGB: subscription.plan.maxStorageGB,
					percentUsed: calcPercent(
						Number(subscription.usedStorageGB),
						subscription.plan.maxStorageGB,
					),
				},
				aiRequests: {
					used: subscription.usedAIRequests,
					limit: subscription.plan.maxAIRequestsPerMonth,
					percentUsed: calcPercent(
						subscription.usedAIRequests,
						subscription.plan.maxAIRequestsPerMonth,
					),
				},
				apiCalls: {
					used: metricTotals["api_calls"] ?? 0,
					limit: null, // No limit on API calls typically
					percentUsed: null,
				},
			},
			history: historyArray,
		};
	}

	/**
	 * Record a usage event
	 */
	async recordUsage(
		organizationId: string,
		metric: string,
		quantity: number,
		metadata?: Record<string, unknown>,
	): Promise<void> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (!subscription) {
			// No subscription - log but don't fail
			console.warn(`No subscription found for organization ${organizationId}`);
			return;
		}

		await db.usageRecord.create({
			data: {
				subscriptionId: subscription.id,
				metric,
				quantity,
				periodStart: subscription.currentPeriodStart,
				periodEnd: subscription.currentPeriodEnd,
				metadata: metadata ?? {},
			},
		});

		// Update aggregate counters
		if (metric === "ai_request" || metric.startsWith("ai_")) {
			await db.subscription.update({
				where: { id: subscription.id },
				data: {
					usedAIRequests: { increment: Math.round(quantity) },
				},
			});
		}

		if (metric === "storage_gb") {
			await db.subscription.update({
				where: { id: subscription.id },
				data: {
					usedStorageGB: { increment: quantity },
				},
			});
		}
	}

	/**
	 * Track seat usage (when members are added/removed)
	 */
	async updateSeatCount(organizationId: string): Promise<number> {
		const memberCount = await db.organizationMember.count({
			where: {
				organizationId,
				status: "ACTIVE",
			},
		});

		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (subscription) {
			await db.subscription.update({
				where: { id: subscription.id },
				data: { usedSeats: memberCount },
			});
		}

		return memberCount;
	}

	/**
	 * Get usage breakdown by metric type
	 */
	async getUsageByMetric(
		organizationId: string,
		metric: string,
		startDate: Date,
		endDate: Date,
	): Promise<Array<{ date: string; value: number }>> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (!subscription) {
			return [];
		}

		const records = await db.usageRecord.findMany({
			where: {
				subscriptionId: subscription.id,
				metric,
				recordedAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			orderBy: { recordedAt: "asc" },
		});

		// Group by date
		const byDate: Map<string, number> = new Map();
		for (const record of records) {
			const dateKey = record.recordedAt.toISOString().split("T")[0];
			byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + Number(record.quantity));
		}

		return Array.from(byDate.entries()).map(([date, value]) => ({
			date,
			value,
		}));
	}

	/**
	 * Get top usage consumers (users, projects, etc.)
	 */
	async getTopConsumers(
		organizationId: string,
		metric: string,
		limit = 10,
	): Promise<
		Array<{
			entityId: string;
			entityType: string;
			usage: number;
		}>
	> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (!subscription) {
			return [];
		}

		const records = await db.usageRecord.findMany({
			where: {
				subscriptionId: subscription.id,
				metric,
				periodStart: subscription.currentPeriodStart,
			},
			select: {
				quantity: true,
				metadata: true,
			},
		});

		// Aggregate by entity (assuming metadata contains entityId and entityType)
		const byEntity: Map<string, { type: string; usage: number }> = new Map();
		for (const record of records) {
			const meta = record.metadata as {
				entityId?: string;
				entityType?: string;
			} | null;
			if (meta?.entityId) {
				const current = byEntity.get(meta.entityId) ?? {
					type: meta.entityType ?? "unknown",
					usage: 0,
				};
				current.usage += Number(record.quantity);
				byEntity.set(meta.entityId, current);
			}
		}

		// Sort and return top N
		return Array.from(byEntity.entries())
			.map(([entityId, { type, usage }]) => ({
				entityId,
				entityType: type,
				usage,
			}))
			.sort((a, b) => b.usage - a.usage)
			.slice(0, limit);
	}

	/**
	 * Reset usage counters at the start of a new billing period
	 */
	async resetPeriodUsage(subscriptionId: string): Promise<void> {
		await db.subscription.update({
			where: { id: subscriptionId },
			data: {
				usedAIRequests: 0,
				// Note: Storage typically accumulates, not resets
				// usedSeats is based on current member count, not reset
			},
		});
	}

	/**
	 * Check if approaching limit and send warning
	 */
	async checkUsageWarnings(organizationId: string): Promise<
		Array<{
			metric: string;
			percentUsed: number;
			warning: "approaching" | "exceeded";
		}>
	> {
		const summary = await this.getUsageSummary(organizationId);
		const warnings: Array<{
			metric: string;
			percentUsed: number;
			warning: "approaching" | "exceeded";
		}> = [];

		const checkMetric = (name: string, percent: number | null) => {
			if (percent === null) return;
			if (percent >= 100) {
				warnings.push({
					metric: name,
					percentUsed: percent,
					warning: "exceeded",
				});
			} else if (percent >= 80) {
				warnings.push({
					metric: name,
					percentUsed: percent,
					warning: "approaching",
				});
			}
		};

		checkMetric("seats", summary.metrics.seats.percentUsed);
		checkMetric("storage", summary.metrics.storage.percentUsed);
		checkMetric("aiRequests", summary.metrics.aiRequests.percentUsed);

		return warnings;
	}
}

// Singleton instance
export const usageService = new UsageService();
