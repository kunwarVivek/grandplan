// ============================================
// NOTIFICATION TYPE DEFINITIONS
// ============================================

export type NotificationType =
	| "task.assigned"
	| "task.mentioned"
	| "task.status_changed"
	| "task.due_soon"
	| "task.overdue"
	| "task.comment_added"
	| "project.invited"
	| "workspace.invited"
	| "organization.invited"
	| "team.added"
	| "ai.decomposition_ready"
	| "ai.suggestion_available"
	| "integration.sync_completed"
	| "integration.sync_failed"
	| "billing.payment_failed"
	| "billing.subscription_expiring";

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
	digestFrequency: "realtime" | "daily" | "weekly" | "none";
	quietHoursStart?: string; // HH:mm format
	quietHoursEnd?: string;
	mutedTypes: NotificationType[];
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
