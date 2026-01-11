// ============================================
// ZOD SCHEMAS FOR JOB PAYLOAD VALIDATION
// ============================================

import { z } from "zod";

// Base schema with common optional fields
const BaseJobSchema = z.object({
	correlationId: z.string().optional(),
	userId: z.string().optional(),
	organizationId: z.string().optional(),
});

// Email Job Schema
export const EmailJobSchema = BaseJobSchema.extend({
	to: z.string().email("Invalid email address"),
	templateId: z.string().min(1, "Template ID is required"),
	data: z.record(z.string(), z.unknown()),
	organizationBranding: z
		.object({
			logo: z.string().optional(),
			primaryColor: z.string().optional(),
			companyName: z.string().optional(),
		})
		.optional(),
});

// Notification Job Schema
export const NotificationJobSchema = BaseJobSchema.extend({
	notificationId: z.string().uuid("Invalid notification ID"),
	channels: z.array(z.enum(["push", "email", "slack"])).min(1, "At least one channel required"),
});

// Digest Job Schema
export const DigestJobSchema = BaseJobSchema.extend({
	userId: z.string().uuid("Invalid user ID"),
	frequency: z.enum(["daily", "weekly"]),
});

// Maintenance/Cleanup Job Schema
export const CleanupJobSchema = BaseJobSchema.extend({
	jobType: z.enum([
		"oldNotifications",
		"expiredSessions",
		"orphanedFiles",
		"auditLogs",
	]),
	olderThanDays: z.number().int().positive("Days must be a positive integer"),
});

// Integration Sync Job Schema
export const IntegrationSyncJobSchema = BaseJobSchema.extend({
	integrationId: z.string().min(1, "Integration ID is required"),
	connectionId: z.string().uuid("Invalid connection ID"),
	direction: z.enum(["toExternal", "fromExternal", "bidirectional"]),
	entityType: z.enum(["task", "project", "comment"]),
	entityIds: z.array(z.string().uuid()).optional(),
});

// Integration Webhook Job Schema
export const IntegrationWebhookJobSchema = BaseJobSchema.extend({
	integrationId: z.string().min(1, "Integration ID is required"),
	connectionId: z.string().uuid("Invalid connection ID"),
	eventType: z.string().min(1, "Event type is required"),
	payload: z.unknown(),
});

// AI Decomposition Job Schema
export const AIDecompositionJobSchema = BaseJobSchema.extend({
	taskId: z.string().uuid("Invalid task ID"),
	workspaceId: z.string().uuid("Invalid workspace ID"),
	depth: z.number().int().min(1).max(5).optional().default(1),
	maxSubtasks: z.number().int().min(1).max(20).optional().default(5),
});

// AI Suggestions Job Schema
export const AISuggestionJobSchema = BaseJobSchema.extend({
	taskId: z.string().uuid("Invalid task ID"),
	suggestionType: z.enum(["status", "priority", "assignee", "deadline"]),
});

// Analytics Job Schema
export const AnalyticsJobSchema = BaseJobSchema.extend({
	metricType: z.enum(["daily", "weekly", "monthly"]),
	date: z.string().refine(
		(val) => !Number.isNaN(Date.parse(val)),
		"Invalid date format"
	),
});

// Export inferred types for type safety
export type ValidatedEmailJobData = z.infer<typeof EmailJobSchema>;
export type ValidatedNotificationJobData = z.infer<typeof NotificationJobSchema>;
export type ValidatedDigestJobData = z.infer<typeof DigestJobSchema>;
export type ValidatedCleanupJobData = z.infer<typeof CleanupJobSchema>;
export type ValidatedIntegrationSyncJobData = z.infer<typeof IntegrationSyncJobSchema>;
export type ValidatedIntegrationWebhookJobData = z.infer<typeof IntegrationWebhookJobSchema>;
export type ValidatedAIDecompositionJobData = z.infer<typeof AIDecompositionJobSchema>;
export type ValidatedAISuggestionJobData = z.infer<typeof AISuggestionJobSchema>;
export type ValidatedAnalyticsJobData = z.infer<typeof AnalyticsJobSchema>;

// Validation helper that logs errors and throws
export function validateJobPayload<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	jobId: string | undefined,
	jobName: string
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const flatErrors = result.error.flatten();
		console.error(`[${jobName}] Invalid job payload`, {
			jobId,
			fieldErrors: flatErrors.fieldErrors,
			formErrors: flatErrors.formErrors,
		});
		throw new Error(
			`Invalid ${jobName} payload: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
		);
	}
	return result.data;
}
