// Re-export notification types from store for consistency
export type {
	Notification,
	NotificationType,
} from "@/stores/notification-store";

export type NotificationChannel = "in_app" | "email" | "push" | "slack";

export type NotificationCategory =
	| "tasks"
	| "comments"
	| "projects"
	| "teams"
	| "organizations"
	| "integrations"
	| "billing"
	| "system";

export type NotificationPreferences = {
	userId: string;
	channels: NotificationChannelPreferences;
	categories: NotificationCategoryPreferences;
	quietHours?: QuietHoursSettings;
	digestFrequency: DigestFrequency;
	updatedAt: Date;
};

export type NotificationChannelPreferences = {
	[K in NotificationChannel]: {
		enabled: boolean;
	};
};

export type NotificationCategoryPreferences = {
	[K in NotificationCategory]: {
		enabled: boolean;
		channels: NotificationChannel[];
	};
};

export type QuietHoursSettings = {
	enabled: boolean;
	startTime: string; // HH:mm format
	endTime: string; // HH:mm format
	timezone: string;
	weekendsOnly: boolean;
};

export type DigestFrequency = "none" | "daily" | "weekly";

export type NotificationSummary = {
	total: number;
	unread: number;
	byCategory: { [K in NotificationCategory]?: number };
};

export type MarkAsReadInput = {
	notificationIds: string[];
};

export type UpdatePreferencesInput = Partial<
	Omit<NotificationPreferences, "userId" | "updatedAt">
>;

export type PushSubscription = {
	id: string;
	userId: string;
	endpoint: string;
	deviceName?: string;
	browser?: string;
	createdAt: Date;
};

export type RegisterPushInput = {
	subscription: PushSubscriptionJSON;
	deviceName?: string;
};

export const NOTIFICATION_CATEGORY_CONFIG: Record<
	NotificationCategory,
	{ label: string; description: string }
> = {
	tasks: {
		label: "Tasks",
		description: "Assignments, mentions, status changes, and due dates",
	},
	comments: {
		label: "Comments",
		description: "Replies and mentions in comments",
	},
	projects: {
		label: "Projects",
		description: "Project invitations and status updates",
	},
	teams: {
		label: "Teams",
		description: "Team invitations and role changes",
	},
	organizations: {
		label: "Organizations",
		description: "Organization invitations and updates",
	},
	integrations: {
		label: "Integrations",
		description: "Connection status and sync issues",
	},
	billing: {
		label: "Billing",
		description: "Payments, invoices, and subscription changes",
	},
	system: {
		label: "System",
		description: "Announcements, maintenance, and updates",
	},
};

export const NOTIFICATION_CHANNEL_CONFIG: Record<
	NotificationChannel,
	{ label: string; description: string }
> = {
	in_app: {
		label: "In-App",
		description: "Notifications in the app",
	},
	email: {
		label: "Email",
		description: "Email notifications",
	},
	push: {
		label: "Push",
		description: "Browser push notifications",
	},
	slack: {
		label: "Slack",
		description: "Slack direct messages",
	},
};
