// ============================================
// NOTIFICATION TYPE DEFINITIONS
// ============================================

// Using Prisma enum-compatible types
export type NotificationType =
	| "TASK_ASSIGNED"
	| "TASK_UNASSIGNED"
	| "TASK_UPDATED"
	| "TASK_COMPLETED"
	| "TASK_DUE_SOON"
	| "TASK_OVERDUE"
	| "TASK_BLOCKED"
	| "TASK_UNBLOCKED"
	| "COMMENT_ADDED"
	| "COMMENT_REPLY"
	| "MENTION"
	| "PROJECT_CREATED"
	| "PROJECT_ARCHIVED"
	| "WORKSPACE_INVITE"
	| "TEAM_INVITE"
	| "TEAM_MEMBER_JOINED"
	| "TEAM_MEMBER_LEFT"
	| "ORG_INVITE"
	| "ORG_MEMBER_JOINED"
	| "AI_DECOMPOSITION_READY"
	| "AI_SUGGESTION_AVAILABLE"
	| "INTEGRATION_CONNECTED"
	| "INTEGRATION_DISCONNECTED"
	| "INTEGRATION_SYNC_COMPLETE"
	| "INTEGRATION_SYNC_FAILED"
	| "SUBSCRIPTION_CREATED"
	| "SUBSCRIPTION_RENEWED"
	| "SUBSCRIPTION_CANCELLED"
	| "PAYMENT_FAILED"
	| "TRIAL_ENDING"
	| "SYSTEM_ANNOUNCEMENT"
	| "SYSTEM_MAINTENANCE";

export type DigestFrequency = "HOURLY" | "DAILY" | "WEEKLY";

export type NotificationChannel = "in_app" | "email" | "push" | "slack";

export interface NotificationPayload {
	type: NotificationType;
	userId: string;
	title: string;
	body: string;
	data?: Record<string, unknown>;
	resourceType?: string;
	resourceId?: string;
	actionUrl?: string;
}

export interface NotificationPreferences {
	userId: string;
	emailEnabled: boolean;
	pushEnabled: boolean;
	slackEnabled: boolean;
	digestEnabled: boolean;
	digestFrequency: DigestFrequency;
	quietHoursEnabled: boolean;
	quietHoursStart?: string; // HH:mm format
	quietHoursEnd?: string;
	typeSettings: Record<string, { email?: boolean; push?: boolean }>;
}

export interface EmailPayload {
	to: string;
	subject: string;
	templateId: string;
	data: Record<string, unknown>;
	organizationBranding?: {
		logo?: string;
		primaryColor?: string;
		companyName?: string;
	};
}

export interface PushPayload {
	userId: string;
	title: string;
	body: string;
	icon?: string;
	badge?: string;
	url?: string;
	data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}
