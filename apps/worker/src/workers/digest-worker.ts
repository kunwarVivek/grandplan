// ============================================
// DIGEST WORKER - Process notification digests
// ============================================

import { db } from "@grandplan/db";
import { emailService } from "@grandplan/notifications";
import {
	type DigestJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import {
	DigestJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

export function registerDigestWorker(): void {
	queueManager.registerWorker<DigestJobData, JobResult>(
		"digest",
		async (job: Job<DigestJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				DigestJobSchema,
				job.data,
				job.id,
				"digest"
			);

			const { userId, frequency } = validatedData;

			console.log(`Processing ${frequency} digest for user ${userId}`);

			try {
				// Get user info
				const user = await db.user.findUnique({
					where: { id: userId },
					select: {
						email: true,
						name: true,
					},
				});

				if (!user) {
					return { success: false, error: "User not found" };
				}

				// Get queued notifications for digest
				const digestItems = await db.digestQueue.findMany({
					where: {
						userId,
						processedAt: null,
					},
					orderBy: { createdAt: "desc" },
				});

				if (digestItems.length === 0) {
					return { success: true, message: "No items to digest" };
				}

				// Get notifications from digest items
				const grouped = digestItems.reduce(
					(acc, item) => {
						const notifications = item.notifications as Array<Record<string, unknown>>;
						for (const notification of notifications) {
							const type = (notification.type as string) ?? "other";
							if (!acc[type]) acc[type] = [];
							acc[type].push(notification);
						}
						return acc;
					},
					{} as Record<string, Array<Record<string, unknown>>>,
				);

				// Get task updates for summary
				const taskUpdates = await getTaskUpdates(userId, frequency);

				// Send digest email
				await emailService.send({
					to: user.email,
					subject: `Your ${frequency} summary from GrandPlan`,
					templateId: "digest",
					data: {
						userName: user.name ?? "there",
						frequency,
						notifications: grouped,
						taskUpdates,
						dashboardUrl: `${process.env.APP_URL}/dashboard`,
					},
				});

				// Mark items as processed
				await db.digestQueue.updateMany({
					where: {
						id: { in: digestItems.map((i) => i.id) },
					},
					data: { processedAt: new Date() },
				});

				return {
					success: true,
					message: `Digest sent with ${digestItems.length} items`,
				};
			} catch (error) {
				console.error("Digest processing failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 3,
		},
	);

	console.log("Digest worker registered");
}

async function getTaskUpdates(
	userId: string,
	frequency: "daily" | "weekly",
): Promise<Array<{ title: string; status: string; changedAt: Date }>> {
	const since = new Date();
	if (frequency === "daily") {
		since.setDate(since.getDate() - 1);
	} else {
		since.setDate(since.getDate() - 7);
	}

	const taskHistory = await db.taskHistory.findMany({
		where: {
			task: {
				assigneeId: userId,
			},
			createdAt: { gte: since },
			field: "status",
		},
		include: {
			task: {
				select: { title: true },
			},
		},
		orderBy: { createdAt: "desc" },
		take: 20,
	});

	return taskHistory.map((h) => ({
		title: h.task.title,
		status: h.newValue as string,
		changedAt: h.createdAt,
	}));
}
