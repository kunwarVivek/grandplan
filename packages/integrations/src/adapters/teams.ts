// ============================================
// TEAMS ADAPTER - Microsoft Teams integration
// ============================================

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
	ExternalItem,
	IntegrationAdapter,
	InternalItem,
	OAuthCredentials,
	SyncResult,
	WebhookPayload,
} from "../types.js";

// Microsoft Graph API types
interface GraphUser {
	id: string;
	displayName: string;
	mail?: string;
	userPrincipalName: string;
}

interface GraphTeam {
	id: string;
	displayName: string;
	description?: string;
}

interface GraphChannel {
	id: string;
	displayName: string;
	description?: string;
}

interface GraphMessage {
	id: string;
	subject?: string;
	body: {
		contentType: "text" | "html";
		content: string;
	};
	from?: {
		user?: GraphUser;
	};
}

interface AdaptiveCard {
	type: "AdaptiveCard";
	$schema: string;
	version: string;
	body: AdaptiveCardElement[];
	actions?: AdaptiveCardAction[];
}

interface AdaptiveCardElement {
	type: string;
	[key: string]: unknown;
}

interface AdaptiveCardAction {
	type: string;
	title: string;
	url?: string;
	data?: Record<string, unknown>;
}

export class TeamsAdapter implements IntegrationAdapter {
	provider = "teams" as const;

	private clientId: string;
	private clientSecret: string;
	private tenantId: string;
	private redirectUri: string;
	private graphBaseUrl = "https://graph.microsoft.com/v1.0";
	private authBaseUrl = "https://login.microsoftonline.com";

	constructor(config: {
		clientId: string;
		clientSecret: string;
		tenantId?: string; // 'common' for multi-tenant, or specific tenant ID
		redirectUri: string;
	}) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.tenantId = config.tenantId ?? "common";
		this.redirectUri = config.redirectUri;
	}

	getAuthorizationUrl(state: string, scopes?: string[]): string {
		const defaultScopes = [
			"openid",
			"profile",
			"offline_access",
			"User.Read",
			"Team.ReadBasic.All",
			"Channel.ReadBasic.All",
			"ChannelMessage.Send",
			"Chat.ReadWrite",
		];
		const scopeList = scopes ?? defaultScopes;

		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			redirect_uri: this.redirectUri,
			scope: scopeList.join(" "),
			state,
			response_mode: "query",
		});

		return `${this.authBaseUrl}/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch(
			`${this.authBaseUrl}/${this.tenantId}/oauth2/v2.0/token`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: this.clientId,
					client_secret: this.clientSecret,
					code,
					redirect_uri: this.redirectUri,
					grant_type: "authorization_code",
				}),
			},
		);

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string;
			token_type?: string;
			id_token?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Teams OAuth error: ${data.error_description ?? data.error}`,
			);
		}

		// Fetch user info
		const userInfo = await this.fetchUserInfo(data.access_token!);

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
			tokenType: data.token_type,
			additionalData: {
				userId: userInfo.id,
				userName: userInfo.displayName,
				userEmail: userInfo.mail ?? userInfo.userPrincipalName,
			},
		};
	}

	async refreshTokens(refreshToken: string): Promise<OAuthCredentials> {
		const response = await fetch(
			`${this.authBaseUrl}/${this.tenantId}/oauth2/v2.0/token`,
			{
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
			},
		);

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Teams token refresh error: ${data.error_description ?? data.error}`,
			);
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

	// Teams doesn't have traditional task sync - it's for notifications
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
		// Microsoft Teams uses HMAC-SHA256 for webhook signatures
		// The signature is in the Authorization header as "HMAC <signature>"
		const expectedSig = signature.replace("HMAC ", "");

		const hmac = createHmac("sha256", this.clientSecret)
			.update(payload)
			.digest("base64");

		try {
			return timingSafeEqual(
				Buffer.from(expectedSig),
				Buffer.from(hmac),
			);
		} catch {
			return false;
		}
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		const data = JSON.parse(payload);

		return {
			integrationId: "teams",
			eventType: data.type ?? "unknown",
			timestamp: new Date(),
			data,
		};
	}

	// Teams-specific methods

	/**
	 * Fetch user info from Graph API
	 */
	private async fetchUserInfo(accessToken: string): Promise<GraphUser> {
		const response = await fetch(`${this.graphBaseUrl}/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user info: ${response.statusText}`);
		}

		return response.json() as Promise<GraphUser>;
	}

	/**
	 * Get list of teams the user is a member of
	 */
	async getTeams(accessToken: string): Promise<GraphTeam[]> {
		const response = await fetch(`${this.graphBaseUrl}/me/joinedTeams`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch teams: ${response.statusText}`);
		}

		const data = (await response.json()) as { value: GraphTeam[] };
		return data.value;
	}

	/**
	 * Get channels in a team
	 */
	async getChannels(
		accessToken: string,
		teamId: string,
	): Promise<GraphChannel[]> {
		const response = await fetch(
			`${this.graphBaseUrl}/teams/${teamId}/channels`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch channels: ${response.statusText}`);
		}

		const data = (await response.json()) as { value: GraphChannel[] };
		return data.value;
	}

	/**
	 * Send a message to a channel
	 */
	async sendChannelMessage(
		accessToken: string,
		teamId: string,
		channelId: string,
		content: string,
		contentType: "text" | "html" = "text",
	): Promise<GraphMessage> {
		const response = await fetch(
			`${this.graphBaseUrl}/teams/${teamId}/channels/${channelId}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					body: {
						contentType,
						content,
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to send message: ${response.statusText}`);
		}

		return response.json() as Promise<GraphMessage>;
	}

	/**
	 * Send an Adaptive Card to a channel
	 */
	async sendAdaptiveCard(
		accessToken: string,
		teamId: string,
		channelId: string,
		card: AdaptiveCard,
	): Promise<GraphMessage> {
		const attachment = {
			contentType: "application/vnd.microsoft.card.adaptive",
			content: card,
		};

		const response = await fetch(
			`${this.graphBaseUrl}/teams/${teamId}/channels/${channelId}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					body: {
						contentType: "html",
						content: '<attachment id="adaptiveCard"></attachment>',
					},
					attachments: [
						{
							id: "adaptiveCard",
							...attachment,
						},
					],
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to send adaptive card: ${response.statusText}`);
		}

		return response.json() as Promise<GraphMessage>;
	}

	/**
	 * Send a task notification as an Adaptive Card
	 */
	async sendTaskNotification(
		accessToken: string,
		teamId: string,
		channelId: string,
		task: {
			id: string;
			title: string;
			description?: string;
			status: string;
			priority?: string;
			assignee?: string;
			dueDate?: string;
			url: string;
		},
	): Promise<void> {
		const statusColors: Record<string, string> = {
			backlog: "#6B7280",
			todo: "#3B82F6",
			in_progress: "#F59E0B",
			in_review: "#8B5CF6",
			blocked: "#EF4444",
			completed: "#22C55E",
			cancelled: "#9CA3AF",
		};

		const priorityEmoji: Record<string, string> = {
			low: "🔽",
			medium: "➡️",
			high: "🔼",
			urgent: "⚡",
		};

		const card: AdaptiveCard = {
			type: "AdaptiveCard",
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			version: "1.4",
			body: [
				{
					type: "Container",
					style: "emphasis",
					items: [
						{
							type: "TextBlock",
							text: task.title,
							weight: "Bolder",
							size: "Medium",
							wrap: true,
						},
					],
				},
				{
					type: "ColumnSet",
					columns: [
						{
							type: "Column",
							width: "stretch",
							items: [
								{
									type: "TextBlock",
									text: "Status",
									isSubtle: true,
									size: "Small",
								},
								{
									type: "TextBlock",
									text: task.status.replace("_", " ").toUpperCase(),
									weight: "Bolder",
									color: statusColors[task.status] ? "Accent" : "Default",
								},
							],
						},
						{
							type: "Column",
							width: "stretch",
							items: [
								{
									type: "TextBlock",
									text: "Priority",
									isSubtle: true,
									size: "Small",
								},
								{
									type: "TextBlock",
									text: `${priorityEmoji[task.priority ?? "medium"] ?? ""} ${(task.priority ?? "Medium").charAt(0).toUpperCase() + (task.priority ?? "medium").slice(1)}`,
									weight: "Bolder",
								},
							],
						},
						{
							type: "Column",
							width: "stretch",
							items: [
								{
									type: "TextBlock",
									text: "Assignee",
									isSubtle: true,
									size: "Small",
								},
								{
									type: "TextBlock",
									text: task.assignee ?? "Unassigned",
									weight: "Bolder",
								},
							],
						},
					],
				},
			],
			actions: [
				{
					type: "Action.OpenUrl",
					title: "View Task",
					url: task.url,
				},
			],
		};

		// Add description if present
		if (task.description) {
			card.body.splice(1, 0, {
				type: "TextBlock",
				text: task.description.slice(0, 200),
				wrap: true,
				isSubtle: true,
			});
		}

		// Add due date if present
		if (task.dueDate) {
			card.body.push({
				type: "TextBlock",
				text: `📅 Due: ${task.dueDate}`,
				isSubtle: true,
				size: "Small",
			});
		}

		await this.sendAdaptiveCard(accessToken, teamId, channelId, card);
	}

	/**
	 * Send a 1:1 chat message to a user
	 */
	async sendDirectMessage(
		accessToken: string,
		userId: string,
		content: string,
		contentType: "text" | "html" = "text",
	): Promise<GraphMessage> {
		// First, create or get the chat
		const chatResponse = await fetch(`${this.graphBaseUrl}/chats`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chatType: "oneOnOne",
				members: [
					{
						"@odata.type": "#microsoft.graph.aadUserConversationMember",
						roles: ["owner"],
						"user@odata.bind": `${this.graphBaseUrl}/users/${userId}`,
					},
				],
			}),
		});

		if (!chatResponse.ok) {
			throw new Error(`Failed to create chat: ${chatResponse.statusText}`);
		}

		const chat = (await chatResponse.json()) as { id: string };

		// Then send the message
		const messageResponse = await fetch(
			`${this.graphBaseUrl}/chats/${chat.id}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					body: {
						contentType,
						content,
					},
				}),
			},
		);

		if (!messageResponse.ok) {
			throw new Error(`Failed to send message: ${messageResponse.statusText}`);
		}

		return messageResponse.json() as Promise<GraphMessage>;
	}

	/**
	 * Create a Teams meeting
	 */
	async createMeeting(
		accessToken: string,
		subject: string,
		startDateTime: Date,
		endDateTime: Date,
		attendees?: string[],
	): Promise<{ id: string; joinUrl: string; subject: string }> {
		const response = await fetch(`${this.graphBaseUrl}/me/onlineMeetings`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				subject,
				startDateTime: startDateTime.toISOString(),
				endDateTime: endDateTime.toISOString(),
				participants: attendees
					? {
							attendees: attendees.map((email) => ({
								upn: email,
								role: "attendee",
							})),
						}
					: undefined,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create meeting: ${response.statusText}`);
		}

		const meeting = (await response.json()) as {
			id: string;
			joinWebUrl: string;
			subject: string;
		};

		return {
			id: meeting.id,
			joinUrl: meeting.joinWebUrl,
			subject: meeting.subject,
		};
	}

	/**
	 * Handle incoming Teams bot command
	 */
	handleBotCommand(activity: {
		type: string;
		text?: string;
		from?: { id: string; name: string };
		conversation?: { id: string };
		channelData?: Record<string, unknown>;
	}): { type: string; text: string } | null {
		if (activity.type !== "message" || !activity.text) {
			return null;
		}

		const text = activity.text.toLowerCase().trim();

		// Remove bot mention if present
		const cleanText = text.replace(/<at>.*?<\/at>/gi, "").trim();

		if (cleanText.startsWith("help")) {
			return {
				type: "message",
				text:
					"🤖 **GrandPlan Bot Commands**\n\n" +
					"• `tasks` - List your assigned tasks\n" +
					"• `create [title]` - Create a new task\n" +
					"• `status` - Show your task summary\n" +
					"• `help` - Show this help message",
			};
		}

		if (cleanText.startsWith("tasks")) {
			return {
				type: "message",
				text: "📋 Fetching your tasks...",
			};
		}

		if (cleanText.startsWith("create ")) {
			const title = cleanText.replace("create ", "").trim();
			return {
				type: "message",
				text: `✅ Creating task: "${title}"...`,
			};
		}

		if (cleanText.startsWith("status")) {
			return {
				type: "message",
				text: "📊 Fetching your status...",
			};
		}

		return {
			type: "message",
			text: "I didn't understand that command. Type `help` to see available commands.",
		};
	}

	/**
	 * Install Teams app for a team (requires admin consent)
	 */
	async installAppInTeam(
		accessToken: string,
		teamId: string,
		appId: string,
	): Promise<void> {
		const response = await fetch(
			`${this.graphBaseUrl}/teams/${teamId}/installedApps`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"teamsApp@odata.bind": `${this.graphBaseUrl}/appCatalogs/teamsApps/${appId}`,
				}),
			},
		);

		if (!response.ok && response.status !== 409) {
			// 409 means already installed
			throw new Error(`Failed to install app: ${response.statusText}`);
		}
	}

	/**
	 * Create a tab in a channel
	 */
	async createChannelTab(
		accessToken: string,
		teamId: string,
		channelId: string,
		tabName: string,
		contentUrl: string,
		websiteUrl: string,
	): Promise<{ id: string }> {
		const response = await fetch(
			`${this.graphBaseUrl}/teams/${teamId}/channels/${channelId}/tabs`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					displayName: tabName,
					"teamsApp@odata.bind": `${this.graphBaseUrl}/appCatalogs/teamsApps/com.microsoft.teamspace.tab.web`,
					configuration: {
						contentUrl,
						websiteUrl,
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to create tab: ${response.statusText}`);
		}

		return response.json() as Promise<{ id: string }>;
	}
}
