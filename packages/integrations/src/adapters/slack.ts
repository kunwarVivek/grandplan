// ============================================
// SLACK ADAPTER - Slack integration
// ============================================

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { InstallProvider } from "@slack/oauth";
import type { Block, KnownBlock } from "@slack/web-api";
import { WebClient } from "@slack/web-api";
import type {
	ExternalItem,
	IntegrationAdapter,
	InternalItem,
	OAuthCredentials,
	SyncResult,
	WebhookPayload,
} from "../types.js";

export class SlackAdapter implements IntegrationAdapter {
	provider = "slack" as const;

	private clientId: string;
	private clientSecret: string;
	private signingSecret: string;
	private redirectUri: string;
	// @ts-expect-error Reserved for OAuth flow implementation
	private _installProvider: InstallProvider | null = null;

	constructor(config: {
		clientId: string;
		clientSecret: string;
		signingSecret: string;
		redirectUri: string;
	}) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.signingSecret = config.signingSecret;
		this.redirectUri = config.redirectUri;

		this._installProvider = new InstallProvider({
			clientId: this.clientId,
			clientSecret: this.clientSecret,
			stateSecret: randomBytes(32).toString("hex"),
		});
	}

	getAuthorizationUrl(state: string, scopes?: string[]): string {
		const defaultScopes = [
			"chat:write",
			"commands",
			"users:read",
			"channels:read",
		];
		const scopeList = scopes ?? defaultScopes;

		const params = new URLSearchParams({
			client_id: this.clientId,
			scope: scopeList.join(","),
			redirect_uri: this.redirectUri,
			state,
		});

		return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch("https://slack.com/api/oauth.v2.access", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				code,
				redirect_uri: this.redirectUri,
			}),
		});

		const data = (await response.json()) as {
			ok: boolean;
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string;
			token_type?: string;
			team?: { id: string; name: string };
			authed_user?: { id: string };
			error?: string;
		};

		if (!data.ok) {
			throw new Error(`Slack OAuth error: ${data.error}`);
		}

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
			tokenType: data.token_type,
			additionalData: {
				teamId: data.team?.id,
				teamName: data.team?.name,
				userId: data.authed_user?.id,
			},
		};
	}

	async refreshTokens(refreshToken: string): Promise<OAuthCredentials> {
		const response = await fetch("https://slack.com/api/oauth.v2.access", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
		});

		const data = (await response.json()) as {
			ok: boolean;
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string;
			error?: string;
		};

		if (!data.ok) {
			throw new Error(`Slack token refresh error: ${data.error}`);
		}

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token ?? refreshToken,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
		};
	}

	// Slack doesn't have traditional task sync - it's for notifications
	async fetchExternalItems(_connectionId: string): Promise<ExternalItem[]> {
		return [];
	}

	async pushToExternal(
		_connectionId: string,
		_items: InternalItem[],
	): Promise<SyncResult> {
		return { success: true, syncedCount: 0, failedCount: 0 };
	}

	verifyWebhook(payload: string, signature: string): boolean {
		const timestamp = signature.split(",")[0]?.split("=")[1];
		const sig = signature.split(",")[1]?.split("=")[1];

		if (!timestamp || !sig) {
			return false;
		}

		// Check timestamp is within 5 minutes
		const time = Number.parseInt(timestamp, 10);
		if (Math.abs(Date.now() / 1000 - time) > 300) {
			return false;
		}

		const baseString = `v0:${timestamp}:${payload}`;
		const hmac = createHmac("sha256", this.signingSecret)
			.update(baseString)
			.digest("hex");

		return timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		const data = JSON.parse(payload);

		return {
			integrationId: "slack",
			eventType: data.type ?? data.event?.type ?? "unknown",
			timestamp: new Date(),
			data,
		};
	}

	// Slack-specific methods

	/**
	 * Send a message to a channel
	 */
	async sendMessage(
		accessToken: string,
		channel: string,
		text: string,
		blocks?: unknown[],
	): Promise<void> {
		const client = new WebClient(accessToken);
		await client.chat.postMessage({
			channel,
			text,
			blocks: (blocks ?? []) as (Block | KnownBlock)[],
		});
	}

	/**
	 * Send a task notification
	 */
	async sendTaskNotification(
		accessToken: string,
		channel: string,
		task: {
			id: string;
			title: string;
			description?: string;
			status: string;
			priority?: string;
			assignee?: string;
			url: string;
		},
	): Promise<void> {
		const blocks = [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*<${task.url}|${task.title}>*`,
				},
			},
			{
				type: "section",
				fields: [
					{
						type: "mrkdwn",
						text: `*Status:*\n${task.status}`,
					},
					{
						type: "mrkdwn",
						text: `*Priority:*\n${task.priority ?? "None"}`,
					},
					{
						type: "mrkdwn",
						text: `*Assignee:*\n${task.assignee ?? "Unassigned"}`,
					},
				],
			},
		];

		if (task.description) {
			blocks.push({
				type: "section",
				text: {
					type: "mrkdwn",
					text: task.description.slice(0, 200),
				},
			});
		}

		await this.sendMessage(accessToken, channel, task.title, blocks);
	}

	/**
	 * Handle slash command
	 */
	async handleSlashCommand(
		command: string,
		text: string,
		_userId: string,
		_channelId: string,
	): Promise<{ response_type: "in_channel" | "ephemeral"; text: string }> {
		switch (command) {
			case "/grandplan": {
				const subcommand = text.split(" ")[0];
				switch (subcommand) {
					case "help":
						return {
							response_type: "ephemeral",
							text:
								"Available commands:\n" +
								"• `/grandplan tasks` - List your assigned tasks\n" +
								"• `/grandplan create [title]` - Create a new task\n" +
								"• `/grandplan status` - Show your task summary",
						};
					case "tasks":
						return {
							response_type: "ephemeral",
							text: "Fetching your tasks...",
						};
					case "create": {
						const title = text.replace("create ", "").trim();
						return {
							response_type: "in_channel",
							text: `Creating task: "${title}"...`,
						};
					}
					default:
						return {
							response_type: "ephemeral",
							text: "Unknown command. Use `/grandplan help` for available commands.",
						};
				}
			}
			default:
				return {
					response_type: "ephemeral",
					text: "Unknown command.",
				};
		}
	}
}
