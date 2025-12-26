export type IntegrationProvider =
	| "github"
	| "gitlab"
	| "bitbucket"
	| "jira"
	| "asana"
	| "trello"
	| "linear"
	| "notion"
	| "slack"
	| "discord"
	| "google_calendar"
	| "outlook_calendar"
	| "figma"
	| "zapier"
	| "make";

export type IntegrationCategory =
	| "version_control"
	| "project_management"
	| "communication"
	| "calendar"
	| "design"
	| "automation";

export type IntegrationStatus = "connected" | "disconnected" | "expired" | "error";

export type Integration = {
	id: string;
	provider: IntegrationProvider;
	name: string;
	description: string;
	category: IntegrationCategory;
	iconUrl?: string;
	features: string[];
	isAvailable: boolean;
	isPremium: boolean;
	setupUrl?: string;
	docsUrl?: string;
};

export type IntegrationConnection = {
	id: string;
	integrationId: string;
	integration: Integration;
	organizationId: string;
	status: IntegrationStatus;
	connectedAt: Date;
	lastSyncAt?: Date | null;
	expiresAt?: Date | null;
	error?: string | null;
	metadata?: Record<string, unknown>;
	settings?: IntegrationSettings;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type IntegrationSettings = {
	autoSync?: boolean;
	syncInterval?: number; // minutes
	syncDirection?: "import" | "export" | "bidirectional";
	mappings?: IntegrationMapping[];
	webhookEnabled?: boolean;
	notifyOnSync?: boolean;
};

export type IntegrationMapping = {
	source: string;
	target: string;
	transform?: string;
};

export type ConnectIntegrationInput = {
	provider: IntegrationProvider;
	code?: string; // OAuth code
	accessToken?: string; // For API key auth
	settings?: IntegrationSettings;
};

export type UpdateConnectionInput = {
	settings?: IntegrationSettings;
};

export type SyncIntegrationInput = {
	connectionId: string;
	fullSync?: boolean;
};

export type OAuthStartResponse = {
	authUrl: string;
	state: string;
};

export const INTEGRATION_PROVIDER_CONFIG: Record<
	IntegrationProvider,
	{ label: string; color: string; iconName: string }
> = {
	github: { label: "GitHub", color: "bg-[#24292e]", iconName: "github" },
	gitlab: { label: "GitLab", color: "bg-[#fc6d26]", iconName: "gitlab" },
	bitbucket: { label: "Bitbucket", color: "bg-[#0052cc]", iconName: "bitbucket" },
	jira: { label: "Jira", color: "bg-[#0052cc]", iconName: "trello" },
	asana: { label: "Asana", color: "bg-[#f06a6a]", iconName: "kanban" },
	trello: { label: "Trello", color: "bg-[#0079bf]", iconName: "trello" },
	linear: { label: "Linear", color: "bg-[#5e6ad2]", iconName: "layout-list" },
	notion: { label: "Notion", color: "bg-[#000000]", iconName: "file-text" },
	slack: { label: "Slack", color: "bg-[#4a154b]", iconName: "slack" },
	discord: { label: "Discord", color: "bg-[#5865f2]", iconName: "message-circle" },
	google_calendar: { label: "Google Calendar", color: "bg-[#4285f4]", iconName: "calendar" },
	outlook_calendar: { label: "Outlook Calendar", color: "bg-[#0078d4]", iconName: "calendar" },
	figma: { label: "Figma", color: "bg-[#f24e1e]", iconName: "figma" },
	zapier: { label: "Zapier", color: "bg-[#ff4a00]", iconName: "zap" },
	make: { label: "Make", color: "bg-[#6d00cc]", iconName: "workflow" },
};

export const INTEGRATION_CATEGORY_CONFIG: Record<
	IntegrationCategory,
	{ label: string; description: string }
> = {
	version_control: {
		label: "Version Control",
		description: "Connect your code repositories",
	},
	project_management: {
		label: "Project Management",
		description: "Sync with other PM tools",
	},
	communication: {
		label: "Communication",
		description: "Team messaging and notifications",
	},
	calendar: {
		label: "Calendar",
		description: "Sync tasks with your calendar",
	},
	design: {
		label: "Design",
		description: "Connect design tools",
	},
	automation: {
		label: "Automation",
		description: "Workflow automation tools",
	},
};

export const INTEGRATION_STATUS_CONFIG: Record<
	IntegrationStatus,
	{ label: string; color: string }
> = {
	connected: { label: "Connected", color: "bg-emerald-500/10 text-emerald-500" },
	disconnected: { label: "Disconnected", color: "bg-muted text-muted-foreground" },
	expired: { label: "Expired", color: "bg-amber-500/10 text-amber-500" },
	error: { label: "Error", color: "bg-red-500/10 text-red-500" },
};
