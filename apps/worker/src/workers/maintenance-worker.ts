// ============================================
// MAINTENANCE WORKER - Cleanup and housekeeping jobs
// ============================================

import { auditService } from "@grandplan/audit";
import { db } from "@grandplan/db";
import {
	type CleanupJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";

export function registerMaintenanceWorker(): void {
	queueManager.registerWorker<CleanupJobData, JobResult>(
		"maintenance",
		async (job: Job<CleanupJobData>): Promise<JobResult> => {
			const { jobType, olderThanDays } = job.data;

			console.log(
				`Running maintenance job: ${jobType} (older than ${olderThanDays} days)`,
			);

			try {
				let deletedCount = 0;
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

				switch (jobType) {
					case "oldNotifications": {
						const notifResult = await db.notification.deleteMany({
							where: {
								read: true,
								createdAt: { lt: cutoffDate },
							},
						});
						deletedCount = notifResult.count;
						break;
					}

					case "expiredSessions": {
						const sessionResult = await db.session.deleteMany({
							where: {
								expiresAt: { lt: new Date() },
							},
						});
						deletedCount = sessionResult.count;
						break;
					}

					case "orphanedFiles":
						// Would implement file cleanup logic
						console.log("Orphaned files cleanup not yet implemented");
						break;

					case "auditLogs":
						deletedCount = await auditService.cleanup(olderThanDays);
						break;

					default:
						return { success: false, error: `Unknown job type: ${jobType}` };
				}

				console.log(`Maintenance ${jobType}: deleted ${deletedCount} records`);

				return {
					success: true,
					message: `Cleaned up ${deletedCount} ${jobType}`,
					data: { deletedCount },
				};
			} catch (error) {
				console.error("Maintenance job failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 1, // Run one at a time
		},
	);

	console.log("Maintenance worker registered");
}
