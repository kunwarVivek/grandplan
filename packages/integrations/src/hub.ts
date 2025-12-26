// ============================================
// INTEGRATION HUB - Central integration management
// ============================================

import { db } from "@grandplan/db";
import { queueManager } from "@grandplan/queue";
import type {
	IntegrationAdapter,
	IntegrationConnection,
	IntegrationDefinition,
	IntegrationProvider,
	OAuthCredentials,
	SyncConfig,
} from "./types.js";

// Integration definitions
const INTEGRATIONS: IntegrationDefinition[] = [
	{
		id: "slack",
		name: "Slack",
		description: "Get task notifications and use slash commands in Slack",
		category: "communication",
		icon: "/integrations/slack.svg",
		requiredScopes: ["chat:write", "commands", "users:read"],
		supportedFeatures: ["notifications", "slash_commands"],
	},
	{
		id: "teams",
		name: "Microsoft Teams",
		description: "Receive notifications and updates in Teams channels",
		category: "communication",
		icon: "/integrations/teams.svg",
		requiredScopes: ["ChannelMessage.Send", "User.Read"],
		supportedFeatures: ["notifications"],
	},
	{
		id: "jira",
		name: "Jira",
		description: "Two-way sync between GrandPlan tasks and Jira issues",
		category: "project_management",
		icon: "/integrations/jira.svg",
		requiredScopes: ["read:jira-work", "write:jira-work"],
		supportedFeatures: ["two_way_sync", "import", "export"],
	},
	{
		id: "asana",
		name: "Asana",
		description: "Sync tasks between GrandPlan and Asana projects",
		category: "project_management",
		icon: "/integrations/asana.svg",
		requiredScopes: ["default"],
		supportedFeatures: ["two_way_sync", "import", "export"],
	},
	{
		id: "linear",
		name: "Linear",
		description: "Sync issues between GrandPlan and Linear",
		category: "project_management",
		icon: "/integrations/linear.svg",
		requiredScopes: ["read", "write"],
		supportedFeatures: ["two_way_sync", "import", "export"],
	},
	{
		id: "notion",
		name: "Notion",
		description: "Import and export tasks from Notion databases",
		category: "documentation",
		icon: "/integrations/notion.svg",
		requiredScopes: [],
		supportedFeatures: ["import", "export"],
	},
	{
		id: "google_calendar",
		name: "Google Calendar",
		description: "Sync task deadlines with Google Calendar",
		category: "calendar",
		icon: "/integrations/google-calendar.svg",
		requiredScopes: ["https://www.googleapis.com/auth/calendar"],
		supportedFeatures: ["calendar_sync"],
	},
	{
		id: "outlook_calendar",
		name: "Outlook Calendar",
		description: "Sync task deadlines with Outlook Calendar",
		category: "calendar",
		icon: "/integrations/outlook-calendar.svg",
		requiredScopes: ["Calendars.ReadWrite"],
		supportedFeatures: ["calendar_sync"],
	},
];

export class IntegrationHub {
	private adapters: Map<IntegrationProvider, IntegrationAdapter> = new Map();

	/**
	 * Register an integration adapter
	 */
	registerAdapter(adapter: IntegrationAdapter): void {
		this.adapters.set(adapter.provider, adapter);
	}

	/**
	 * Get all available integrations
	 */
	getAvailableIntegrations(): IntegrationDefinition[] {
		return INTEGRATIONS;
	}

	/**
	 * Get integration by ID
	 */
	getIntegration(id: IntegrationProvider): IntegrationDefinition | undefined {
		return INTEGRATIONS.find((i) => i.id === id);
	}

	/**
	 * Get adapter for an integration
	 */
	getAdapter(provider: IntegrationProvider): IntegrationAdapter {
		const adapter = this.adapters.get(provider);
		if (!adapter) {
			throw new Error(`Adapter for ${provider} not registered`);
		}
		return adapter;
	}

	/**
	 * Get user's connected integrations
	 */
	async getUserConnections(userId: string): Promise<IntegrationConnection[]> {
		const connections = await db.integrationConnection.findMany({
			where: { userId, status: "active" },
		});

		return connections.map((c) => ({
			id: c.id,
			userId: c.userId,
			organizationId: c.organizationId ?? undefined,
			integrationId: c.integrationId as IntegrationProvider,
			credentials: c.credentials as unknown as OAuthCredentials,
			status: c.status as "active" | "expired" | "error",
			metadata: c.metadata as Record<string, unknown> | undefined,
		}));
	}

	/**
	 * Connect an integration
	 */
	async connect(
		userId: string,
		integrationId: IntegrationProvider,
		credentials: OAuthCredentials,
		organizationId?: string,
	): Promise<IntegrationConnection> {
		const connection = await db.integrationConnection.create({
			data: {
				userId,
				integrationId,
				organizationId,
				credentials: credentials as unknown as Record<string, unknown>,
				status: "active",
			},
		});

		return {
			id: connection.id,
			userId: connection.userId,
			organizationId: connection.organizationId ?? undefined,
			integrationId: connection.integrationId as IntegrationProvider,
			credentials,
			status: "active",
		};
	}

	/**
	 * Disconnect an integration
	 */
	async disconnect(connectionId: string, userId: string): Promise<void> {
		await db.integrationConnection.updateMany({
			where: { id: connectionId, userId },
			data: { status: "disconnected" },
		});
	}

	/**
	 * Refresh integration credentials
	 */
	async refreshCredentials(connectionId: string): Promise<OAuthCredentials> {
		const connection = await db.integrationConnection.findUnique({
			where: { id: connectionId },
		});

		if (!connection) {
			throw new Error("Connection not found");
		}

		const adapter = this.getAdapter(
			connection.integrationId as IntegrationProvider,
		);
		const credentials = connection.credentials as unknown as OAuthCredentials;

		if (!credentials.refreshToken) {
			throw new Error("No refresh token available");
		}

		const newCredentials = await adapter.refreshTokens(
			credentials.refreshToken,
		);

		await db.integrationConnection.update({
			where: { id: connectionId },
			data: {
				credentials: newCredentials as unknown as Record<string, unknown>,
				status: "active",
			},
		});

		return newCredentials;
	}

	/**
	 * Configure sync settings
	 */
	async configureSyncSettings(config: SyncConfig): Promise<void> {
		await db.integrationSyncConfig.upsert({
			where: {
				connectionId_entityType: {
					connectionId: config.connectionId,
					entityType: config.entityType,
				},
			},
			create: {
				connectionId: config.connectionId,
				entityType: config.entityType,
				direction: config.direction,
				fieldMappings: config.fieldMappings as unknown as Record<
					string,
					unknown
				>[],
				filters: config.filters as unknown as
					| Record<string, unknown>[]
					| undefined,
				schedule: config.schedule,
				enabled: true,
			},
			update: {
				direction: config.direction,
				fieldMappings: config.fieldMappings as unknown as Record<
					string,
					unknown
				>[],
				filters: config.filters as unknown as
					| Record<string, unknown>[]
					| undefined,
				schedule: config.schedule,
			},
		});
	}

	/**
	 * Trigger a sync job
	 */
	async triggerSync(
		connectionId: string,
		options?: {
			direction?: "toExternal" | "fromExternal" | "bidirectional";
			entityIds?: string[];
		},
	): Promise<void> {
		const connection = await db.integrationConnection.findUnique({
			where: { id: connectionId },
		});

		if (!connection) {
			throw new Error("Connection not found");
		}

		await queueManager.addJob("integration:sync", {
			integrationId: connection.integrationId,
			connectionId,
			direction: options?.direction ?? "bidirectional",
			entityType: "task",
			entityIds: options?.entityIds,
		});
	}
}

// Singleton instance
export const integrationHub = new IntegrationHub();
