// ============================================
// LINEAR ADAPTER - Linear integration
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

// Linear API types
interface LinearUser {
	id: string;
	name: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	active: boolean;
}

interface LinearTeam {
	id: string;
	key: string;
	name: string;
	description?: string;
	icon?: string;
	color?: string;
}

interface LinearProject {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	state: string;
	progress: number;
	startDate?: string;
	targetDate?: string;
	lead?: LinearUser;
	teams: { nodes: LinearTeam[] };
	createdAt: string;
	updatedAt: string;
}

interface LinearWorkflowState {
	id: string;
	name: string;
	type: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
	color: string;
	position: number;
}

interface LinearLabel {
	id: string;
	name: string;
	color: string;
}

interface LinearIssue {
	id: string;
	identifier: string;
	title: string;
	description?: string;
	priority: number; // 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low
	priorityLabel: string;
	estimate?: number;
	state: LinearWorkflowState;
	assignee?: LinearUser;
	creator?: LinearUser;
	team: LinearTeam;
	project?: LinearProject;
	parent?: LinearIssue;
	labels: { nodes: LinearLabel[] };
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	canceledAt?: string;
	url: string;
}

interface LinearComment {
	id: string;
	body: string;
	createdAt: string;
	updatedAt: string;
	user: LinearUser;
}

interface LinearWebhook {
	id: string;
	enabled: boolean;
	label: string;
	url: string;
	resourceTypes: string[];
	createdAt: string;
}

// Status mapping: Linear workflow state types to internal statuses
const LINEAR_STATUS_MAP: Record<string, string> = {
	backlog: "backlog",
	unstarted: "todo",
	started: "in_progress",
	completed: "completed",
	cancelled: "cancelled",
};

// Reverse status mapping
const INTERNAL_TO_LINEAR_STATUS: Record<string, string> = {
	backlog: "backlog",
	todo: "unstarted",
	in_progress: "started",
	in_review: "started",
	blocked: "started",
	completed: "completed",
	cancelled: "cancelled",
};

// Priority mapping: Linear priority numbers to internal priorities
const LINEAR_PRIORITY_MAP: Record<number, string> = {
	0: "medium", // No priority defaults to medium
	1: "urgent",
	2: "high",
	3: "medium",
	4: "low",
};

// Reverse priority mapping
const INTERNAL_TO_LINEAR_PRIORITY: Record<string, number> = {
	urgent: 1,
	high: 2,
	medium: 3,
	low: 4,
};

export class LinearAdapter implements IntegrationAdapter {
	provider = "linear" as const;

	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private webhookSecret?: string;
	private apiBaseUrl = "https://api.linear.app";
	private authBaseUrl = "https://linear.app";

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
		const defaultScopes = ["read", "write", "issues:create", "comments:create"];
		const scopeList = scopes ?? defaultScopes;

		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			response_type: "code",
			state,
			scope: scopeList.join(","),
			prompt: "consent",
		});

		return `${this.authBaseUrl}/oauth/authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch(`${this.apiBaseUrl}/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: this.clientId,
				client_secret: this.clientSecret,
				redirect_uri: this.redirectUri,
				code,
			}),
		});

		const data = (await response.json()) as {
			access_token?: string;
			token_type?: string;
			expires_in?: number;
			scope?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Linear OAuth error: ${data.error_description ?? data.error}`,
			);
		}

		// Fetch user info and teams
		const userInfo = await this.getCurrentUser(data.access_token!);
		const teams = await this.getTeams(data.access_token!);

		return {
			accessToken: data.access_token!,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
			tokenType: data.token_type,
			additionalData: {
				userId: userInfo.id,
				userName: userInfo.name,
				userEmail: userInfo.email,
				teams: teams.map((t) => ({ id: t.id, key: t.key, name: t.name })),
				primaryTeamId: teams[0]?.id,
			},
		};
	}

	async refreshTokens(_refreshToken: string): Promise<OAuthCredentials> {
		// Linear OAuth tokens don't expire and don't have refresh tokens
		// This is kept for interface compatibility
		throw new Error(
			"Linear OAuth tokens do not expire and don't require refresh",
		);
	}

	async fetchExternalItems(
		connectionId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]> {
		throw new Error(
			"Use fetchIssues directly with access token and team ID for Linear integration",
		);
	}

	async pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult> {
		throw new Error(
			"Use createIssue/updateIssue directly with access token for Linear integration",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		if (!this.webhookSecret) {
			console.warn("Webhook secret not configured for Linear adapter");
			return false;
		}

		// Linear uses HMAC-SHA256 for webhook signatures
		// The signature is in the Linear-Signature header
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
			action: string;
			type: string;
			createdAt: string;
			data: Record<string, unknown>;
			url?: string;
			organizationId?: string;
			webhookId?: string;
		};

		return {
			integrationId: "linear",
			eventType: `${data.type}:${data.action}`,
			timestamp: new Date(data.createdAt),
			data,
		};
	}

	// Linear-specific methods

	/**
	 * Execute a GraphQL query against Linear API
	 */
	private async graphql<T>(
		accessToken: string,
		query: string,
		variables?: Record<string, unknown>,
	): Promise<T> {
		const response = await fetch(`${this.apiBaseUrl}/graphql`, {
			method: "POST",
			headers: {
				Authorization: accessToken,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		});

		const result = (await response.json()) as {
			data?: T;
			errors?: Array<{ message: string }>;
		};

		if (result.errors && result.errors.length > 0) {
			throw new Error(`Linear GraphQL error: ${result.errors[0].message}`);
		}

		return result.data!;
	}

	/**
	 * Get current user info
	 */
	async getCurrentUser(accessToken: string): Promise<LinearUser> {
		const query = `
			query {
				viewer {
					id
					name
					email
					displayName
					avatarUrl
					active
				}
			}
		`;

		const result = await this.graphql<{ viewer: LinearUser }>(
			accessToken,
			query,
		);
		return result.viewer;
	}

	/**
	 * Get all teams the user belongs to
	 */
	async getTeams(accessToken: string): Promise<LinearTeam[]> {
		const query = `
			query {
				teams {
					nodes {
						id
						key
						name
						description
						icon
						color
					}
				}
			}
		`;

		const result = await this.graphql<{ teams: { nodes: LinearTeam[] } }>(
			accessToken,
			query,
		);
		return result.teams.nodes;
	}

	/**
	 * Get workflow states for a team
	 */
	async getWorkflowStates(
		accessToken: string,
		teamId: string,
	): Promise<LinearWorkflowState[]> {
		const query = `
			query($teamId: String!) {
				team(id: $teamId) {
					states {
						nodes {
							id
							name
							type
							color
							position
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			team: { states: { nodes: LinearWorkflowState[] } };
		}>(accessToken, query, { teamId });

		return result.team.states.nodes;
	}

	/**
	 * Get projects for a team
	 */
	async getProjects(
		accessToken: string,
		teamId?: string,
	): Promise<LinearProject[]> {
		const query = `
			query($teamId: String) {
				projects(filter: { team: { id: { eq: $teamId } } }) {
					nodes {
						id
						name
						description
						icon
						color
						state
						progress
						startDate
						targetDate
						lead {
							id
							name
							email
						}
						teams {
							nodes {
								id
								key
								name
							}
						}
						createdAt
						updatedAt
					}
				}
			}
		`;

		const result = await this.graphql<{
			projects: { nodes: LinearProject[] };
		}>(accessToken, query, { teamId });

		return result.projects.nodes;
	}

	/**
	 * Get issues for a team
	 */
	async getIssues(
		accessToken: string,
		teamId: string,
		options?: {
			since?: Date;
			projectId?: string;
			stateType?: string;
			first?: number;
		},
	): Promise<LinearIssue[]> {
		const filter: Record<string, unknown> = {
			team: { id: { eq: teamId } },
		};

		if (options?.since) {
			filter.updatedAt = { gte: options.since.toISOString() };
		}

		if (options?.projectId) {
			filter.project = { id: { eq: options.projectId } };
		}

		if (options?.stateType) {
			filter.state = { type: { eq: options.stateType } };
		}

		const query = `
			query($filter: IssueFilter, $first: Int) {
				issues(filter: $filter, first: $first) {
					nodes {
						id
						identifier
						title
						description
						priority
						priorityLabel
						estimate
						state {
							id
							name
							type
							color
							position
						}
						assignee {
							id
							name
							email
							displayName
							avatarUrl
						}
						creator {
							id
							name
							email
						}
						team {
							id
							key
							name
						}
						project {
							id
							name
						}
						parent {
							id
							identifier
							title
						}
						labels {
							nodes {
								id
								name
								color
							}
						}
						dueDate
						createdAt
						updatedAt
						completedAt
						canceledAt
						url
					}
				}
			}
		`;

		const result = await this.graphql<{ issues: { nodes: LinearIssue[] } }>(
			accessToken,
			query,
			{ filter, first: options?.first ?? 50 },
		);

		return result.issues.nodes;
	}

	/**
	 * Fetch issues and convert to ExternalItem format
	 */
	async fetchIssues(
		accessToken: string,
		teamId: string,
		options?: { since?: Date; projectId?: string },
	): Promise<ExternalItem[]> {
		const issues = await this.getIssues(accessToken, teamId, options);
		return issues.map((issue) => this.mapLinearIssueToExternal(issue));
	}

	/**
	 * Get a single issue by ID
	 */
	async getIssue(accessToken: string, issueId: string): Promise<LinearIssue> {
		const query = `
			query($issueId: String!) {
				issue(id: $issueId) {
					id
					identifier
					title
					description
					priority
					priorityLabel
					estimate
					state {
						id
						name
						type
						color
						position
					}
					assignee {
						id
						name
						email
						displayName
						avatarUrl
					}
					creator {
						id
						name
						email
					}
					team {
						id
						key
						name
					}
					project {
						id
						name
					}
					parent {
						id
						identifier
						title
					}
					labels {
						nodes {
							id
							name
							color
						}
					}
					dueDate
					createdAt
					updatedAt
					completedAt
					canceledAt
					url
				}
			}
		`;

		const result = await this.graphql<{ issue: LinearIssue }>(
			accessToken,
			query,
			{ issueId },
		);

		return result.issue;
	}

	/**
	 * Create a new issue
	 */
	async createIssue(
		accessToken: string,
		issue: {
			teamId: string;
			title: string;
			description?: string;
			priority?: number;
			stateId?: string;
			assigneeId?: string;
			projectId?: string;
			parentId?: string;
			labelIds?: string[];
			dueDate?: string;
			estimate?: number;
		},
	): Promise<LinearIssue> {
		const mutation = `
			mutation($input: IssueCreateInput!) {
				issueCreate(input: $input) {
					success
					issue {
						id
						identifier
						title
						url
					}
				}
			}
		`;

		const input: Record<string, unknown> = {
			teamId: issue.teamId,
			title: issue.title,
		};

		if (issue.description) {
			input.description = issue.description;
		}

		if (issue.priority !== undefined) {
			input.priority = issue.priority;
		}

		if (issue.stateId) {
			input.stateId = issue.stateId;
		}

		if (issue.assigneeId) {
			input.assigneeId = issue.assigneeId;
		}

		if (issue.projectId) {
			input.projectId = issue.projectId;
		}

		if (issue.parentId) {
			input.parentId = issue.parentId;
		}

		if (issue.labelIds && issue.labelIds.length > 0) {
			input.labelIds = issue.labelIds;
		}

		if (issue.dueDate) {
			input.dueDate = issue.dueDate;
		}

		if (issue.estimate !== undefined) {
			input.estimate = issue.estimate;
		}

		const result = await this.graphql<{
			issueCreate: {
				success: boolean;
				issue: { id: string; identifier: string; title: string; url: string };
			};
		}>(accessToken, mutation, { input });

		if (!result.issueCreate.success) {
			throw new Error("Failed to create issue");
		}

		// Fetch the full issue
		return this.getIssue(accessToken, result.issueCreate.issue.id);
	}

	/**
	 * Update an existing issue
	 */
	async updateIssue(
		accessToken: string,
		issueId: string,
		updates: {
			title?: string;
			description?: string;
			priority?: number;
			stateId?: string;
			assigneeId?: string | null;
			projectId?: string | null;
			labelIds?: string[];
			dueDate?: string | null;
			estimate?: number | null;
		},
	): Promise<LinearIssue> {
		const mutation = `
			mutation($issueId: String!, $input: IssueUpdateInput!) {
				issueUpdate(id: $issueId, input: $input) {
					success
					issue {
						id
					}
				}
			}
		`;

		const input: Record<string, unknown> = {};

		if (updates.title !== undefined) {
			input.title = updates.title;
		}

		if (updates.description !== undefined) {
			input.description = updates.description;
		}

		if (updates.priority !== undefined) {
			input.priority = updates.priority;
		}

		if (updates.stateId !== undefined) {
			input.stateId = updates.stateId;
		}

		if (updates.assigneeId !== undefined) {
			input.assigneeId = updates.assigneeId;
		}

		if (updates.projectId !== undefined) {
			input.projectId = updates.projectId;
		}

		if (updates.labelIds !== undefined) {
			input.labelIds = updates.labelIds;
		}

		if (updates.dueDate !== undefined) {
			input.dueDate = updates.dueDate;
		}

		if (updates.estimate !== undefined) {
			input.estimate = updates.estimate;
		}

		const result = await this.graphql<{
			issueUpdate: { success: boolean; issue: { id: string } };
		}>(accessToken, mutation, { issueId, input });

		if (!result.issueUpdate.success) {
			throw new Error("Failed to update issue");
		}

		return this.getIssue(accessToken, issueId);
	}

	/**
	 * Delete an issue
	 */
	async deleteIssue(accessToken: string, issueId: string): Promise<void> {
		const mutation = `
			mutation($issueId: String!) {
				issueDelete(id: $issueId) {
					success
				}
			}
		`;

		const result = await this.graphql<{
			issueDelete: { success: boolean };
		}>(accessToken, mutation, { issueId });

		if (!result.issueDelete.success) {
			throw new Error("Failed to delete issue");
		}
	}

	/**
	 * Add a comment to an issue
	 */
	async addComment(
		accessToken: string,
		issueId: string,
		body: string,
	): Promise<LinearComment> {
		const mutation = `
			mutation($issueId: String!, $body: String!) {
				commentCreate(input: { issueId: $issueId, body: $body }) {
					success
					comment {
						id
						body
						createdAt
						updatedAt
						user {
							id
							name
							email
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			commentCreate: { success: boolean; comment: LinearComment };
		}>(accessToken, mutation, { issueId, body });

		if (!result.commentCreate.success) {
			throw new Error("Failed to create comment");
		}

		return result.commentCreate.comment;
	}

	/**
	 * Get comments for an issue
	 */
	async getComments(
		accessToken: string,
		issueId: string,
	): Promise<LinearComment[]> {
		const query = `
			query($issueId: String!) {
				issue(id: $issueId) {
					comments {
						nodes {
							id
							body
							createdAt
							updatedAt
							user {
								id
								name
								email
							}
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			issue: { comments: { nodes: LinearComment[] } };
		}>(accessToken, query, { issueId });

		return result.issue.comments.nodes;
	}

	/**
	 * Search for users in the organization
	 */
	async searchUsers(accessToken: string, query: string): Promise<LinearUser[]> {
		const gqlQuery = `
			query($query: String!) {
				users(filter: { name: { containsIgnoreCase: $query } }) {
					nodes {
						id
						name
						email
						displayName
						avatarUrl
						active
					}
				}
			}
		`;

		const result = await this.graphql<{ users: { nodes: LinearUser[] } }>(
			accessToken,
			gqlQuery,
			{ query },
		);

		return result.users.nodes;
	}

	/**
	 * Get labels for a team
	 */
	async getLabels(accessToken: string, teamId: string): Promise<LinearLabel[]> {
		const query = `
			query($teamId: String!) {
				team(id: $teamId) {
					labels {
						nodes {
							id
							name
							color
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			team: { labels: { nodes: LinearLabel[] } };
		}>(accessToken, query, { teamId });

		return result.team.labels.nodes;
	}

	/**
	 * Register a webhook
	 */
	async registerWebhook(
		accessToken: string,
		url: string,
		label: string,
		resourceTypes: string[] = ["Issue", "Comment", "Project"],
	): Promise<LinearWebhook> {
		const mutation = `
			mutation($url: String!, $label: String!, $resourceTypes: [String!]!) {
				webhookCreate(input: { url: $url, label: $label, resourceTypes: $resourceTypes }) {
					success
					webhook {
						id
						enabled
						label
						url
						resourceTypes
						createdAt
					}
				}
			}
		`;

		const result = await this.graphql<{
			webhookCreate: { success: boolean; webhook: LinearWebhook };
		}>(accessToken, mutation, { url, label, resourceTypes });

		if (!result.webhookCreate.success) {
			throw new Error("Failed to create webhook");
		}

		return result.webhookCreate.webhook;
	}

	/**
	 * Delete a webhook
	 */
	async deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
		const mutation = `
			mutation($webhookId: String!) {
				webhookDelete(id: $webhookId) {
					success
				}
			}
		`;

		const result = await this.graphql<{
			webhookDelete: { success: boolean };
		}>(accessToken, mutation, { webhookId });

		if (!result.webhookDelete.success) {
			throw new Error("Failed to delete webhook");
		}
	}

	/**
	 * Get all webhooks
	 */
	async getWebhooks(accessToken: string): Promise<LinearWebhook[]> {
		const query = `
			query {
				webhooks {
					nodes {
						id
						enabled
						label
						url
						resourceTypes
						createdAt
					}
				}
			}
		`;

		const result = await this.graphql<{
			webhooks: { nodes: LinearWebhook[] };
		}>(accessToken, query);

		return result.webhooks.nodes;
	}

	// Mapping helpers

	/**
	 * Map a Linear issue to the internal ExternalItem format
	 */
	mapLinearIssueToExternal(issue: LinearIssue): ExternalItem {
		return {
			externalId: issue.id,
			type: "task",
			data: {
				identifier: issue.identifier,
				title: issue.title,
				description: issue.description,
				status: this.mapLinearStatusToInternal(issue.state.type),
				priority: this.mapLinearPriorityToInternal(issue.priority),
				estimate: issue.estimate,
				assigneeId: issue.assignee?.id,
				assigneeName: issue.assignee?.name,
				assigneeEmail: issue.assignee?.email,
				creatorId: issue.creator?.id,
				creatorName: issue.creator?.name,
				teamId: issue.team.id,
				teamKey: issue.team.key,
				teamName: issue.team.name,
				projectId: issue.project?.id,
				projectName: issue.project?.name,
				parentId: issue.parent?.id,
				parentIdentifier: issue.parent?.identifier,
				labels: issue.labels.nodes.map((l) => l.name),
				dueDate: issue.dueDate,
				createdAt: issue.createdAt,
				updatedAt: issue.updatedAt,
				completedAt: issue.completedAt,
				canceledAt: issue.canceledAt,
			},
			metadata: {
				linearIssueId: issue.id,
				linearIdentifier: issue.identifier,
				linearTeamId: issue.team.id,
				linearProjectId: issue.project?.id,
				linearStateId: issue.state.id,
				linearStateType: issue.state.type,
				linearPriority: issue.priority,
				linearUrl: issue.url,
				labelIds: issue.labels.nodes.map((l) => l.id),
			},
		};
	}

	/**
	 * Map Linear workflow state type to internal status
	 */
	mapLinearStatusToInternal(stateType: string): string {
		return LINEAR_STATUS_MAP[stateType] ?? "in_progress";
	}

	/**
	 * Map internal status to Linear workflow state type
	 */
	mapInternalStatusToLinear(status: string): string {
		return INTERNAL_TO_LINEAR_STATUS[status] ?? "started";
	}

	/**
	 * Map Linear priority number to internal priority
	 */
	mapLinearPriorityToInternal(priority: number): string {
		return LINEAR_PRIORITY_MAP[priority] ?? "medium";
	}

	/**
	 * Map internal priority to Linear priority number
	 */
	mapInternalPriorityToLinear(priority: string): number {
		return INTERNAL_TO_LINEAR_PRIORITY[priority] ?? 3;
	}

	/**
	 * Find a workflow state by internal status
	 */
	async findStateByInternalStatus(
		accessToken: string,
		teamId: string,
		internalStatus: string,
	): Promise<LinearWorkflowState | undefined> {
		const targetType = this.mapInternalStatusToLinear(internalStatus);
		const states = await this.getWorkflowStates(accessToken, teamId);

		return states.find((s) => s.type === targetType);
	}

	/**
	 * Handle webhook event and map to internal format
	 */
	handleWebhookEvent(payload: WebhookPayload): {
		action: "created" | "updated" | "deleted" | "unknown";
		resourceType: string;
		issue?: ExternalItem;
		changes?: Record<string, { from?: unknown; to?: unknown }>;
	} {
		const data = payload.data as {
			action: string;
			type: string;
			data: Record<string, unknown>;
			updatedFrom?: Record<string, unknown>;
		};

		let action: "created" | "updated" | "deleted" | "unknown" = "unknown";

		switch (data.action) {
			case "create":
				action = "created";
				break;
			case "update":
				action = "updated";
				break;
			case "remove":
				action = "deleted";
				break;
		}

		const result: {
			action: "created" | "updated" | "deleted" | "unknown";
			resourceType: string;
			issue?: ExternalItem;
			changes?: Record<string, { from?: unknown; to?: unknown }>;
		} = {
			action,
			resourceType: data.type,
		};

		// If this is an issue event and we have issue data
		if (data.type === "Issue" && data.data) {
			// Construct a minimal LinearIssue from webhook data
			const issueData = data.data as Partial<LinearIssue>;
			if (issueData.id) {
				result.issue = {
					externalId: issueData.id,
					type: "task",
					data: {
						identifier: issueData.identifier,
						title: issueData.title,
						description: issueData.description,
						status: issueData.state
							? this.mapLinearStatusToInternal(issueData.state.type)
							: undefined,
						priority:
							issueData.priority !== undefined
								? this.mapLinearPriorityToInternal(issueData.priority)
								: undefined,
					},
					metadata: {
						linearIssueId: issueData.id,
						linearIdentifier: issueData.identifier,
						linearUrl: issueData.url,
					},
				};
			}
		}

		// Include changes if available
		if (data.updatedFrom) {
			result.changes = {};
			for (const [key, value] of Object.entries(data.updatedFrom)) {
				result.changes[key] = {
					from: value,
					to: (data.data as Record<string, unknown>)?.[key],
				};
			}
		}

		return result;
	}
}
