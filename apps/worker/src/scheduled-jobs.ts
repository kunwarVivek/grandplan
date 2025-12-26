// ============================================
// SCHEDULED JOBS - Cron-based recurring jobs
// ============================================

import { db } from "@grandplan/db";
import { queueManager } from "@grandplan/queue";

export async function setupScheduledJobs(): Promise<void> {
	// Daily digest - runs at 8 AM UTC
	await queueManager.scheduleRecurringJob(
		"digest",
		"daily-digest",
		{ frequency: "daily" },
		"0 8 * * *",
	);

	// Weekly digest - runs at 8 AM UTC on Mondays
	await queueManager.scheduleRecurringJob(
		"digest",
		"weekly-digest",
		{ frequency: "weekly" },
		"0 8 * * 1",
	);

	// Cleanup old notifications - runs daily at 2 AM UTC
	await queueManager.scheduleRecurringJob(
		"maintenance",
		"cleanup-notifications",
		{ jobType: "oldNotifications", olderThanDays: 30 },
		"0 2 * * *",
	);

	// Cleanup expired sessions - runs every 6 hours
	await queueManager.scheduleRecurringJob(
		"maintenance",
		"cleanup-sessions",
		{ jobType: "expiredSessions", olderThanDays: 0 },
		"0 */6 * * *",
	);

	// Cleanup old audit logs - runs weekly on Sundays at 3 AM UTC
	await queueManager.scheduleRecurringJob(
		"maintenance",
		"cleanup-audit-logs",
		{ jobType: "auditLogs", olderThanDays: 90 },
		"0 3 * * 0",
	);

	// Integration sync check - runs every hour
	await scheduleIntegrationSyncJobs();

	console.log("Scheduled jobs configured");
}

async function scheduleIntegrationSyncJobs(): Promise<void> {
	// Get all sync configurations with schedules
	const syncConfigs = await db.integrationSyncConfig.findMany({
		where: {
			enabled: true,
			schedule: { not: null },
		},
		include: {
			connection: true,
		},
	});

	for (const config of syncConfigs) {
		if (config.schedule) {
			await queueManager.scheduleRecurringJob(
				"integration:sync",
				`sync-${config.id}`,
				{
					integrationId: config.connection.integrationId,
					connectionId: config.connectionId,
					direction: config.direction as
						| "toExternal"
						| "fromExternal"
						| "bidirectional",
					entityType: config.entityType as "task" | "project" | "comment",
				},
				config.schedule,
			);
		}
	}
}

/**
 * Process daily digests for all users with daily preference
 */
export async function processDailyDigests(): Promise<void> {
	const users = await db.notificationPreference.findMany({
		where: { digestFrequency: "daily" },
		select: { userId: true },
	});

	for (const { userId } of users) {
		await queueManager.addJob("digest", {
			userId,
			frequency: "daily",
		});
	}

	console.log(`Queued ${users.length} daily digests`);
}

/**
 * Process weekly digests for all users with weekly preference
 */
export async function processWeeklyDigests(): Promise<void> {
	const users = await db.notificationPreference.findMany({
		where: { digestFrequency: "weekly" },
		select: { userId: true },
	});

	for (const { userId } of users) {
		await queueManager.addJob("digest", {
			userId,
			frequency: "weekly",
		});
	}

	console.log(`Queued ${users.length} weekly digests`);
}
