// ============================================
// INTEGRATION SERVICE
// ============================================

import { NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";
import {
	type IntegrationProvider,
	integrationHub,
	type OAuthCredentials,
	oauthManager,
} from "@grandplan/integrations";
import { queueManager } from "@grandplan/queue";

export interface InitiateOAuthResult {
	authUrl: string;
	state: string;
}

export interface ConnectionStatus {
	id: string;
	integrationId: string;
	status: string;
	lastSyncAt: Date | null;
	lastErrorAt: Date | null;
	lastError: string | null;
}

export class IntegrationService {
	/**
	 * Get all available integrations
	 */
	getAvailableIntegrations() {
		return integrationHub.getAvailableIntegrations();
	}

	/**
	 * Get user's active integration connections
	 */
	async getUserConnections(userId: string) {
		return db.integrationConnection.findMany({
			where: {
				userId,
				status: "ACTIVE",
			},
			include: {
				integration: true,
			},
		});
	}

	/**
	 * Initiate OAuth flow for an integration
	 */
	async initiateOAuth(
		userId: string,
		provider: IntegrationProvider,
		baseUrl: string,
	): Promise<InitiateOAuthResult> {
		const integration = integrationHub.getIntegration(provider);
		if (!integration) {
			throw new NotFoundError("Integration", provider);
		}

		const integrationDef = await db.integrationDefinition.findFirst({
			where: { code: provider.toUpperCase() as never },
		});
		if (!integrationDef) {
			throw new NotFoundError("IntegrationDefinition", provider);
		}

		const state = oauthManager.generateState();
		const redirectUri = oauthManager.createCallbackUrl(baseUrl, provider);
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		await db.integrationOAuthState.create({
			data: {
				userId,
				integrationId: integrationDef.id,
				state,
				redirectUri,
				scopes: integration.requiredScopes,
				expiresAt,
			},
		});

		const adapter = integrationHub.getAdapter(provider);
		const authUrl = adapter.getAuthorizationUrl(
			state,
			integration.requiredScopes,
		);

		return { authUrl, state };
	}

	/**
	 * Complete OAuth flow and create connection
	 */
	async completeOAuth(
		provider: IntegrationProvider,
		code: string,
		state: string,
		userId: string,
	) {
		const oauthState = await db.integrationOAuthState.findUnique({
			where: { state },
			include: { integration: true },
		});

		if (!oauthState) {
			throw new Error("Invalid or expired OAuth state");
		}

		if (oauthState.userId !== userId) {
			throw new Error("OAuth state does not match user");
		}

		if (oauthState.expiresAt < new Date()) {
			throw new Error("OAuth state has expired");
		}

		if (oauthState.usedAt) {
			throw new Error("OAuth state has already been used");
		}

		await db.integrationOAuthState.update({
			where: { id: oauthState.id },
			data: { usedAt: new Date() },
		});

		const adapter = integrationHub.getAdapter(provider);
		const credentials = await adapter.exchangeCodeForTokens(code);

		const encryptedAccessToken = oauthManager.encryptCredentials({
			accessToken: credentials.accessToken,
		} as OAuthCredentials);

		const encryptedRefreshToken = credentials.refreshToken
			? oauthManager.encryptCredentials({
					accessToken: credentials.refreshToken,
				} as OAuthCredentials)
			: null;

		const connection = await db.integrationConnection.create({
			data: {
				userId,
				integrationId: oauthState.integrationId,
				accessToken: encryptedAccessToken,
				refreshToken: encryptedRefreshToken,
				tokenExpiresAt: credentials.expiresAt ?? null,
				externalUserId: credentials.additionalData?.userId as
					| string
					| undefined,
				externalTeamId: credentials.additionalData?.teamId as
					| string
					| undefined,
				metadata: credentials.additionalData ?? null,
				status: "ACTIVE",
			},
			include: {
				integration: true,
			},
		});

		return connection;
	}

	/**
	 * Disconnect an integration (soft-delete)
	 */
	async disconnect(connectionId: string, userId: string): Promise<void> {
		const connection = await db.integrationConnection.findFirst({
			where: { id: connectionId, userId },
		});

		if (!connection) {
			throw new NotFoundError("IntegrationConnection", connectionId);
		}

		await db.integrationConnection.update({
			where: { id: connectionId },
			data: { status: "INACTIVE" },
		});
	}

	/**
	 * Get connection status with sync information
	 */
	async getConnectionStatus(
		connectionId: string,
		userId: string,
	): Promise<ConnectionStatus> {
		const connection = await db.integrationConnection.findFirst({
			where: { id: connectionId, userId },
		});

		if (!connection) {
			throw new NotFoundError("IntegrationConnection", connectionId);
		}

		return {
			id: connection.id,
			integrationId: connection.integrationId,
			status: connection.status,
			lastSyncAt: connection.lastSyncAt,
			lastErrorAt: connection.lastErrorAt,
			lastError: connection.lastError,
		};
	}

	/**
	 * Trigger a sync job for a connection
	 */
	async triggerSync(
		connectionId: string,
		userId: string,
		direction:
			| "toExternal"
			| "fromExternal"
			| "bidirectional" = "bidirectional",
	): Promise<void> {
		const connection = await db.integrationConnection.findFirst({
			where: { id: connectionId, userId },
			include: { integration: true },
		});

		if (!connection) {
			throw new NotFoundError("IntegrationConnection", connectionId);
		}

		await queueManager.addJob("integration:sync", {
			integrationId: connection.integration.code,
			connectionId,
			direction,
			entityType: "task",
		});
	}
}

export const integrationService = new IntegrationService();
