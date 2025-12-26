// ============================================
// QUEUE TYPE DEFINITIONS
// ============================================

export interface BaseJobData {
	correlationId?: string;
	userId?: string;
	organizationId?: string;
}

// AI Jobs
export interface AIDecompositionJobData extends BaseJobData {
	taskId: string;
	workspaceId: string;
	depth?: number;
	maxSubtasks?: number;
}

export interface AISuggestionJobData extends BaseJobData {
	taskId: string;
	suggestionType: "status" | "priority" | "assignee" | "deadline";
}

// Notification Jobs
export interface NotificationJobData extends BaseJobData {
	notificationId: string;
	channels: ("push" | "email" | "slack")[];
}

export interface EmailJobData extends BaseJobData {
	to: string;
	templateId: string;
	data: Record<string, unknown>;
	organizationBranding?: {
		logo?: string;
		primaryColor?: string;
		companyName?: string;
	};
}

export interface DigestJobData extends BaseJobData {
	userId: string;
	frequency: "daily" | "weekly";
}

// Integration Jobs
export interface IntegrationSyncJobData extends BaseJobData {
	integrationId: string;
	connectionId: string;
	direction: "toExternal" | "fromExternal" | "bidirectional";
	entityType: "task" | "project" | "comment";
	entityIds?: string[];
}

export interface IntegrationWebhookJobData extends BaseJobData {
	integrationId: string;
	connectionId: string;
	eventType: string;
	payload: unknown;
}

// Maintenance Jobs
export interface CleanupJobData extends BaseJobData {
	jobType:
		| "oldNotifications"
		| "expiredSessions"
		| "orphanedFiles"
		| "auditLogs";
	olderThanDays: number;
}

export interface AnalyticsJobData extends BaseJobData {
	metricType: "daily" | "weekly" | "monthly";
	date: string;
}

// Job result types
export interface JobResult {
	success: boolean;
	message?: string;
	data?: unknown;
	error?: string;
}

// Queue names
export type QueueName =
	| "ai:decomposition"
	| "ai:suggestions"
	| "notifications"
	| "email"
	| "digest"
	| "integration:sync"
	| "integration:webhooks"
	| "maintenance"
	| "analytics";
