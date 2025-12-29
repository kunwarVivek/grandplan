// ============================================
// JIRA ADAPTER - Atlassian Jira integration
// ============================================

import { createHmac } from "node:crypto";
import type {
	ExternalItem,
	IntegrationAdapter,
	InternalItem,
	OAuthCredentials,
	SyncResult,
	WebhookPayload,
} from "../types.js";

// Jira API types
interface JiraUser {
	accountId: string;
	displayName: string;
	emailAddress?: string;
	avatarUrls?: Record<string, string>;
	active: boolean;
}

interface JiraProject {
	id: string;
	key: string;
	name: string;
	description?: string;
	projectTypeKey: string;
	lead?: JiraUser;
	avatarUrls?: Record<string, string>;
}

interface JiraIssueType {
	id: string;
	name: string;
	description?: string;
	subtask: boolean;
	iconUrl?: string;
}

interface JiraStatus {
	id: string;
	name: string;
	statusCategory: {
		id: number;
		key: string;
		name: string;
		colorName: string;
	};
}

interface JiraPriority {
	id: string;
	name: string;
	iconUrl?: string;
}

interface JiraIssue {
	id: string;
	key: string;
	self: string;
	fields: {
		summary: string;
		description?: string | null;
		status: JiraStatus;
		priority?: JiraPriority;
		issuetype: JiraIssueType;
		project: JiraProject;
		assignee?: JiraUser | null;
		reporter?: JiraUser;
		created: string;
		updated: string;
		duedate?: string | null;
		labels?: string[];
		parent?: { id: string; key: string };
	};
}

interface JiraSearchResult {
	startAt: number;
	maxResults: number;
	total: number;
	issues: JiraIssue[];
}

interface JiraCloudResource {
	id: string;
	name: string;
	url: string;
	scopes: string[];
	avatarUrl?: string;
}

// Status mapping: Jira status categories to internal statuses
const JIRA_STATUS_CATEGORY_MAP: Record<string, string> = {
	new: "backlog",
	undefined: "backlog",
	indeterminate: "in_progress",
	done: "completed",
};

// Priority mapping: Jira priorities to internal priorities
const JIRA_PRIORITY_MAP: Record<string, string> = {
	highest: "urgent",
	high: "high",
	medium: "medium",
	low: "low",
	lowest: "low",
};

// Reverse priority mapping: internal to Jira
const INTERNAL_TO_JIRA_PRIORITY: Record<string, string> = {
	urgent: "Highest",
	high: "High",
	medium: "Medium",
	low: "Low",
};

export class JiraAdapter implements IntegrationAdapter {
	provider = "jira" as const;

	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private webhookSecret?: string;
	private authBaseUrl = "https://auth.atlassian.com";
	private apiBaseUrl = "https://api.atlassian.com";

	// Cache for cloud resources (sites)
	private cloudResources: Map<string, JiraCloudResource[]> = new Map();

	constructor(config: {
		clientId: string;
		clientSecret: string;
		redirectUri: string;
		webhookSecret?: string;
	}) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.redirectUri = config.redirectUri;
		this.webhookSecret = config.webhookSecret;
	}

	getAuthorizationUrl(state: string, scopes?: string[]): string {
		const defaultScopes = [
			"read:jira-user",
			"read:jira-work",
			"write:jira-work",
			"manage:jira-project",
			"manage:jira-webhook",
			"offline_access",
		];
		const scopeList = scopes ?? defaultScopes;

		const params = new URLSearchParams({
			audience: "api.atlassian.com",
			client_id: this.clientId,
			scope: scopeList.join(" "),
			redirect_uri: this.redirectUri,
			state,
			response_type: "code",
			prompt: "consent",
		});

		return `${this.authBaseUrl}/authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				grant_type: "authorization_code",
				client_id: this.clientId,
				client_secret: this.clientSecret,
				code,
				redirect_uri: this.redirectUri,
			}),
		});

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
			scope?: string;
			token_type?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Jira OAuth error: ${data.error_description ?? data.error}`,
			);
		}

		// Fetch accessible cloud resources
		const resources = await this.getAccessibleResources(data.access_token!);

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
			tokenType: data.token_type,
			additionalData: {
				cloudResources: resources,
				primaryCloudId: resources[0]?.id,
				primarySiteName: resources[0]?.name,
			},
		};
	}

	async refreshTokens(refreshToken: string): Promise<OAuthCredentials> {
		const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				grant_type: "refresh_token",
				client_id: this.clientId,
				client_secret: this.clientSecret,
				refresh_token: refreshToken,
			}),
		});

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
				`Jira token refresh error: ${data.error_description ?? data.error}`,
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

	async fetchExternalItems(
		connectionId: string,
		options?: { since?: Date; cloudId?: string; projectKey?: string },
	): Promise<ExternalItem[]> {
		// This would typically get the access token and cloud ID from a connection store
		// For now, we'll assume it's passed via options or stored
		throw new Error(
			"Use fetchIssues directly with access token and cloud ID for Jira integration",
		);
	}

	async pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult> {
		// This would typically get the access token and cloud ID from a connection store
		throw new Error(
			"Use createIssue/updateIssue directly with access token and cloud ID for Jira integration",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		if (!this.webhookSecret) {
			console.warn("Webhook secret not configured for Jira adapter");
			return false;
		}

		// Jira webhooks can use a shared secret for HMAC verification
		// The signature format depends on webhook configuration
		const hmac = crypto
			.createHmac("sha256", this.webhookSecret)
			.update(payload)
			.digest("hex");

		try {
			return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
		} catch {
			return false;
		}
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		const data = JSON.parse(payload) as {
			webhookEvent?: string;
			timestamp?: number;
			issue?: JiraIssue;
			changelog?: {
				items: Array<{
					field: string;
					fromString?: string;
					toString?: string;
				}>;
			};
			user?: JiraUser;
		};

		return {
			integrationId: "jira",
			eventType: data.webhookEvent ?? "unknown",
			timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
			data: data as unknown as Record<string, unknown>,
		};
	}

	// Jira-specific methods

	/**
	 * Get accessible Atlassian Cloud resources (Jira sites)
	 */
	async getAccessibleResources(
		accessToken: string,
	): Promise<JiraCloudResource[]> {
		const response = await fetch(
			`${this.apiBaseUrl}/oauth/token/accessible-resources`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch accessible resources: ${response.statusText}`,
			);
		}

		return response.json() as Promise<JiraCloudResource[]>;
	}

	/**
	 * Get current user info
	 */
	async getCurrentUser(
		accessToken: string,
		cloudId: string,
	): Promise<JiraUser> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/myself`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch current user: ${response.statusText}`);
		}

		return response.json() as Promise<JiraUser>;
	}

	/**
	 * Fetch all projects from a Jira cloud instance
	 */
	async getProjects(
		accessToken: string,
		cloudId: string,
	): Promise<JiraProject[]> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/project/search`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch projects: ${response.statusText}`);
		}

		const data = (await response.json()) as { values: JiraProject[] };
		return data.values;
	}

	/**
	 * Search for issues using JQL
	 */
	async searchIssues(
		accessToken: string,
		cloudId: string,
		jql: string,
		options?: {
			startAt?: number;
			maxResults?: number;
			fields?: string[];
		},
	): Promise<JiraSearchResult> {
		const params = new URLSearchParams({
			jql,
			startAt: String(options?.startAt ?? 0),
			maxResults: String(options?.maxResults ?? 50),
		});

		if (options?.fields) {
			params.set("fields", options.fields.join(","));
		}

		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/search?${params.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to search issues: ${response.statusText}`);
		}

		return response.json() as Promise<JiraSearchResult>;
	}

	/**
	 * Fetch issues from a specific project
	 */
	async fetchIssues(
		accessToken: string,
		cloudId: string,
		projectKey: string,
		options?: { since?: Date; maxResults?: number },
	): Promise<ExternalItem[]> {
		let jql = `project = "${projectKey}"`;
		if (options?.since) {
			jql += ` AND updated >= "${options.since.toISOString().split("T")[0]}"`;
		}
		jql += " ORDER BY updated DESC";

		const result = await this.searchIssues(accessToken, cloudId, jql, {
			maxResults: options?.maxResults ?? 100,
		});

		return result.issues.map((issue) => this.mapJiraIssueToExternal(issue));
	}

	/**
	 * Get a single issue by key
	 */
	async getIssue(
		accessToken: string,
		cloudId: string,
		issueKey: string,
	): Promise<JiraIssue> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch issue: ${response.statusText}`);
		}

		return response.json() as Promise<JiraIssue>;
	}

	/**
	 * Create a new issue
	 */
	async createIssue(
		accessToken: string,
		cloudId: string,
		issue: {
			projectKey: string;
			summary: string;
			description?: string;
			issueTypeId: string;
			priority?: string;
			assigneeAccountId?: string;
			labels?: string[];
			dueDate?: string;
		},
	): Promise<JiraIssue> {
		const fields: Record<string, unknown> = {
			project: { key: issue.projectKey },
			summary: issue.summary,
			issuetype: { id: issue.issueTypeId },
		};

		if (issue.description) {
			// Jira uses Atlassian Document Format (ADF) for descriptions
			fields.description = {
				type: "doc",
				version: 1,
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: issue.description }],
					},
				],
			};
		}

		if (issue.priority) {
			fields.priority = { name: issue.priority };
		}

		if (issue.assigneeAccountId) {
			fields.assignee = { accountId: issue.assigneeAccountId };
		}

		if (issue.labels) {
			fields.labels = issue.labels;
		}

		if (issue.dueDate) {
			fields.duedate = issue.dueDate;
		}

		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ fields }),
			},
		);

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`Failed to create issue: ${response.statusText} - ${errorBody}`,
			);
		}

		const result = (await response.json()) as {
			id: string;
			key: string;
			self: string;
		};

		// Fetch the full issue to return
		return this.getIssue(accessToken, cloudId, result.key);
	}

	/**
	 * Update an existing issue
	 */
	async updateIssue(
		accessToken: string,
		cloudId: string,
		issueKey: string,
		updates: {
			summary?: string;
			description?: string;
			priority?: string;
			assigneeAccountId?: string | null;
			labels?: string[];
			dueDate?: string | null;
		},
	): Promise<void> {
		const fields: Record<string, unknown> = {};

		if (updates.summary !== undefined) {
			fields.summary = updates.summary;
		}

		if (updates.description !== undefined) {
			fields.description = updates.description
				? {
						type: "doc",
						version: 1,
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: updates.description }],
							},
						],
					}
				: null;
		}

		if (updates.priority !== undefined) {
			fields.priority = { name: updates.priority };
		}

		if (updates.assigneeAccountId !== undefined) {
			fields.assignee = updates.assigneeAccountId
				? { accountId: updates.assigneeAccountId }
				: null;
		}

		if (updates.labels !== undefined) {
			fields.labels = updates.labels;
		}

		if (updates.dueDate !== undefined) {
			fields.duedate = updates.dueDate;
		}

		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ fields }),
			},
		);

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`Failed to update issue: ${response.statusText} - ${errorBody}`,
			);
		}
	}

	/**
	 * Transition an issue to a new status
	 */
	async transitionIssue(
		accessToken: string,
		cloudId: string,
		issueKey: string,
		transitionId: string,
		comment?: string,
	): Promise<void> {
		const body: Record<string, unknown> = {
			transition: { id: transitionId },
		};

		if (comment) {
			body.update = {
				comment: [
					{
						add: {
							body: {
								type: "doc",
								version: 1,
								content: [
									{
										type: "paragraph",
										content: [{ type: "text", text: comment }],
									},
								],
							},
						},
					},
				],
			};
		}

		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to transition issue: ${response.statusText}`);
		}
	}

	/**
	 * Get available transitions for an issue
	 */
	async getTransitions(
		accessToken: string,
		cloudId: string,
		issueKey: string,
	): Promise<Array<{ id: string; name: string; to: JiraStatus }>> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch transitions: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			transitions: Array<{ id: string; name: string; to: JiraStatus }>;
		};
		return data.transitions;
	}

	/**
	 * Add a comment to an issue
	 */
	async addComment(
		accessToken: string,
		cloudId: string,
		issueKey: string,
		comment: string,
	): Promise<void> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/comment`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					body: {
						type: "doc",
						version: 1,
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: comment }],
							},
						],
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to add comment: ${response.statusText}`);
		}
	}

	/**
	 * Register a webhook for issue events
	 */
	async registerWebhook(
		accessToken: string,
		cloudId: string,
		webhookUrl: string,
		events: string[] = [
			"jira:issue_created",
			"jira:issue_updated",
			"jira:issue_deleted",
		],
		jqlFilter?: string,
	): Promise<{ id: string }> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/webhook`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: webhookUrl,
					webhooks: [
						{
							events,
							jqlFilter: jqlFilter ?? "TRUE",
						},
					],
				}),
			},
		);

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(
				`Failed to register webhook: ${response.statusText} - ${errorBody}`,
			);
		}

		const data = (await response.json()) as {
			webhookRegistrationResult: Array<{ createdWebhookId: number }>;
		};
		return { id: String(data.webhookRegistrationResult[0]?.createdWebhookId) };
	}

	/**
	 * Delete a webhook
	 */
	async deleteWebhook(
		accessToken: string,
		cloudId: string,
		webhookId: string,
	): Promise<void> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/webhook`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					webhookIds: [Number(webhookId)],
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to delete webhook: ${response.statusText}`);
		}
	}

	/**
	 * Get issue types for a project
	 */
	async getIssueTypes(
		accessToken: string,
		cloudId: string,
		projectKey: string,
	): Promise<JiraIssueType[]> {
		const response = await fetch(
			`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/project/${projectKey}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch project: ${response.statusText}`);
		}

		const project = (await response.json()) as { issueTypes: JiraIssueType[] };
		return project.issueTypes;
	}

	// Mapping helpers

	/**
	 * Map a Jira issue to the internal ExternalItem format
	 */
	mapJiraIssueToExternal(issue: JiraIssue): ExternalItem {
		return {
			externalId: issue.id,
			type: "task",
			data: {
				key: issue.key,
				title: issue.fields.summary,
				description: this.extractTextFromADF(issue.fields.description),
				status: this.mapJiraStatusToInternal(issue.fields.status),
				priority: this.mapJiraPriorityToInternal(issue.fields.priority),
				assigneeId: issue.fields.assignee?.accountId,
				assigneeName: issue.fields.assignee?.displayName,
				reporterId: issue.fields.reporter?.accountId,
				reporterName: issue.fields.reporter?.displayName,
				projectId: issue.fields.project.id,
				projectKey: issue.fields.project.key,
				projectName: issue.fields.project.name,
				issueType: issue.fields.issuetype.name,
				labels: issue.fields.labels,
				dueDate: issue.fields.duedate,
				createdAt: issue.fields.created,
				updatedAt: issue.fields.updated,
				parentKey: issue.fields.parent?.key,
			},
			metadata: {
				jiraIssueKey: issue.key,
				jiraIssueId: issue.id,
				jiraProjectKey: issue.fields.project.key,
				jiraStatusId: issue.fields.status.id,
				jiraStatusCategory: issue.fields.status.statusCategory.key,
				jiraIssueTypeId: issue.fields.issuetype.id,
				jiraUrl: issue.self.replace("/rest/api/3/issue/", "/browse/"),
			},
		};
	}

	/**
	 * Map Jira status category to internal status
	 */
	mapJiraStatusToInternal(status: JiraStatus): string {
		return JIRA_STATUS_CATEGORY_MAP[status.statusCategory.key] ?? "in_progress";
	}

	/**
	 * Map Jira priority to internal priority
	 */
	mapJiraPriorityToInternal(priority?: JiraPriority): string {
		if (!priority) return "medium";
		return JIRA_PRIORITY_MAP[priority.name.toLowerCase()] ?? "medium";
	}

	/**
	 * Map internal priority to Jira priority
	 */
	mapInternalPriorityToJira(priority: string): string {
		return INTERNAL_TO_JIRA_PRIORITY[priority] ?? "Medium";
	}

	/**
	 * Extract plain text from Atlassian Document Format
	 */
	private extractTextFromADF(adf: unknown): string {
		if (!adf || typeof adf !== "object") return "";

		const doc = adf as {
			content?: Array<{ content?: Array<{ text?: string }> }>;
		};
		if (!doc.content) return "";

		return doc.content
			.map((block) => {
				if (!block.content) return "";
				return block.content.map((item) => item.text ?? "").join("");
			})
			.join("\n");
	}

	/**
	 * Handle webhook event and map to internal format
	 */
	handleWebhookEvent(payload: WebhookPayload): {
		action: "created" | "updated" | "deleted" | "unknown";
		issue?: ExternalItem;
		changes?: Array<{ field: string; from?: string; to?: string }>;
	} {
		const data = payload.data as {
			webhookEvent?: string;
			issue?: JiraIssue;
			changelog?: {
				items: Array<{
					field: string;
					fromString?: string;
					toString?: string;
				}>;
			};
		};

		let action: "created" | "updated" | "deleted" | "unknown" = "unknown";

		switch (payload.eventType) {
			case "jira:issue_created":
				action = "created";
				break;
			case "jira:issue_updated":
				action = "updated";
				break;
			case "jira:issue_deleted":
				action = "deleted";
				break;
		}

		const result: {
			action: "created" | "updated" | "deleted" | "unknown";
			issue?: ExternalItem;
			changes?: Array<{ field: string; from?: string; to?: string }>;
		} = { action };

		if (data.issue) {
			result.issue = this.mapJiraIssueToExternal(data.issue);
		}

		if (data.changelog?.items) {
			result.changes = data.changelog.items.map((item) => ({
				field: item.field,
				from: item.fromString,
				to: item.toString,
			}));
		}

		return result;
	}
}
