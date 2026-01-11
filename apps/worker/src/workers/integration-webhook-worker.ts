// ============================================
// INTEGRATION WEBHOOK WORKER - Process webhook events
// ============================================

import { db } from "@grandplan/db";
import {
	type IntegrationProvider,
	webhookHandler,
} from "@grandplan/integrations";
import {
	type IntegrationWebhookJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import {
	IntegrationWebhookJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

export function registerIntegrationWebhookWorker(): void {
	queueManager.registerWorker<IntegrationWebhookJobData, JobResult>(
		"integration:webhooks",
		async (job: Job<IntegrationWebhookJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				IntegrationWebhookJobSchema,
				job.data,
				job.id,
				"integration:webhooks"
			);

			const { integrationId, eventType, payload } = validatedData;

			console.log(
				`Processing webhook event ${eventType} from ${integrationId}`,
			);

			try {
				// Process the webhook event
				await webhookHandler.processWebhookEvent(
					integrationId as IntegrationProvider,
					eventType,
					payload as Record<string, unknown>,
				);

				// Mark webhook event as processed in database
				await db.integrationWebhookEvent.updateMany({
					where: {
						integrationId,
						eventType,
						status: "PENDING",
					},
					data: {
						status: "COMPLETED",
						processedAt: new Date(),
					},
				});

				return {
					success: true,
					message: `Processed ${eventType} event from ${integrationId}`,
				};
			} catch (error) {
				console.error("Webhook processing failed:", error);
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

	console.log("Integration webhook worker registered");
}
