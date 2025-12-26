// ============================================
// INTEGRATION TYPE DEFINITIONS
// ============================================

export type IntegrationProvider =
	| "slack"
	| "teams"
	| "jira"
	| "asana"
	| "linear"
	| "notion"
	| "google_calendar"
	| "outlook_calendar";

export type IntegrationCategory =
	| "communication"
	| "project_management"
	| "calendar"
	| "documentation";

export interface IntegrationDefinition {
	id: IntegrationProvider;
	name: string;
	description: string;
	category: IntegrationCategory;
	icon: string;
	requiredScopes: string[];
	supportedFeatures: IntegrationFeature[];
}

export type IntegrationFeature =
	| "notifications"
	| "two_way_sync"
	| "import"
	| "export"
	| "slash_commands"
	| "calendar_sync";

export interface OAuthCredentials {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	scope?: string;
	tokenType?: string;
	additionalData?: Record<string, unknown>;
}

export interface IntegrationConnection {
	id: string;
	userId: string;
	organizationId?: string;
	integrationId: IntegrationProvider;
	credentials: OAuthCredentials;
	status: "active" | "expired" | "error";
	metadata?: Record<string, unknown>;
}

export interface SyncConfig {
	connectionId: string;
	entityType: "task" | "project" | "comment";
	direction: "toExternal" | "fromExternal" | "bidirectional";
	fieldMappings: FieldMapping[];
	filters?: SyncFilter[];
	schedule?: string; // cron expression
}

export interface FieldMapping {
	internalField: string;
	externalField: string;
	transform?: "none" | "status_map" | "priority_map" | "user_map";
	transformConfig?: Record<string, unknown>;
}

export interface SyncFilter {
	field: string;
	operator: "eq" | "neq" | "in" | "nin";
	value: unknown;
}

export interface ExternalLink {
	taskId: string;
	integrationId: IntegrationProvider;
	externalId: string;
	externalUrl?: string;
	lastSyncedAt: Date;
	syncStatus: "synced" | "pending" | "error";
}

export interface WebhookPayload {
	integrationId: IntegrationProvider;
	eventType: string;
	timestamp: Date;
	data: Record<string, unknown>;
	signature?: string;
}

// Adapter interface
export interface IntegrationAdapter {
	provider: IntegrationProvider;

	// OAuth
	getAuthorizationUrl(state: string, scopes?: string[]): string;
	exchangeCodeForTokens(code: string): Promise<OAuthCredentials>;
	refreshTokens(refreshToken: string): Promise<OAuthCredentials>;

	// Sync operations
	fetchExternalItems(
		connectionId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]>;
	pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult>;

	// Webhooks
	verifyWebhook(payload: string, signature: string): boolean;
	parseWebhookEvent(payload: string): WebhookPayload;
}

export interface ExternalItem {
	externalId: string;
	type: "task" | "project" | "comment";
	data: Record<string, unknown>;
	metadata: Record<string, unknown>;
}

export interface InternalItem {
	id: string;
	type: "task" | "project" | "comment";
	data: Record<string, unknown>;
}

export interface SyncResult {
	success: boolean;
	syncedCount: number;
	failedCount: number;
	errors?: Array<{ itemId: string; error: string }>;
}
