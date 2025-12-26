// ============================================
// NOTIFICATION WORKER - Push/Slack notification delivery
// ============================================

import { db } from "@grandplan/db";
import { pushService } from "@grandplan/notifications";
import {
	type JobResult,
	type NotificationJobData,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";

export function registerNotificationWorker(): void {
	queueManager.registerWorker<NotificationJobData, JobResult>(
		"notifications",
		async (job: Job<NotificationJobData>): Promise<JobResult> => {
			const { notificationId, channels, userId } = job.data;

			console.log(`Processing notification job ${job.id} for user ${userId}`);

			try {
				// Get notification from database
				const notification = await db.notification.findUnique({
					where: { id: notificationId },
				});

				if (!notification) {
					return { success: false, error: "Notification not found" };
				}

				// Process each channel
				for (const channel of channels) {
					switch (channel) {
						case "push":
							await pushService.send({
								userId,
								title: notification.title,
								body: notification.body,
								url: notification.actionUrl ?? undefined,
								data: notification.data as Record<string, unknown>,
							});
							break;

						case "slack":
							// Would integrate with Slack service
							console.log(
								`Slack notification for user ${userId}: ${notification.title}`,
							);
							break;

						default:
							console.log(`Unknown channel: ${channel}`);
					}
				}

				return {
					success: true,
					message: `Notification delivered to ${channels.length} channels`,
				};
			} catch (error) {
				console.error("Notification delivery failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 10,
		},
	);

	console.log("Notification worker registered");
}
