// ============================================
// EMAIL WORKER - Email sending with rate limiting
// ============================================

import { db } from "@grandplan/db";
import { emailService } from "@grandplan/notifications";
import {
	type EmailJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";

export function registerEmailWorker(): void {
	queueManager.registerWorker<EmailJobData, JobResult>(
		"email",
		async (job: Job<EmailJobData>): Promise<JobResult> => {
			const { to, templateId, data, organizationBranding } = job.data;

			console.log(`Processing email job ${job.id} to ${to}`);

			try {
				// Get organization branding if not provided
				let branding = organizationBranding;
				if (!branding && job.data.organizationId) {
					const org = await db.organization.findUnique({
						where: { id: job.data.organizationId },
						select: {
							brandingConfig: true,
							name: true,
						},
					});

					if (org?.brandingConfig) {
						const config = org.brandingConfig as Record<string, string>;
						branding = {
							logo: config.logo,
							primaryColor: config.primaryColor,
							companyName: org.name,
						};
					}
				}

				// Generate subject based on template
				const subject = generateSubject(templateId, data);

				// Send email
				await emailService.send({
					to,
					subject,
					templateId,
					data,
					organizationBranding: branding,
				});

				return {
					success: true,
					message: `Email sent to ${to}`,
				};
			} catch (error) {
				console.error("Email sending failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 5, // Rate limited
		},
	);

	console.log("Email worker registered");
}

function generateSubject(
	templateId: string,
	data: Record<string, unknown>,
): string {
	const subjects: Record<string, string> = {
		task_assigned: `You've been assigned to: ${data.taskTitle ?? "a task"}`,
		task_mentioned: `${data.mentionerName ?? "Someone"} mentioned you`,
		organization_invited: `You're invited to join ${data.organizationName ?? "an organization"}`,
		digest: `Your ${data.frequency ?? "daily"} task summary`,
		password_reset: "Reset your password",
		welcome: "Welcome to GrandPlan!",
	};

	return subjects[templateId] ?? "Notification from GrandPlan";
}
