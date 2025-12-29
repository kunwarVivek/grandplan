// ============================================
// ASANA ADAPTER - Asana integration
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

// Asana API types
interface AsanaUser {
	gid: string;
	name: string;
	email?: string;
	photo?: {
		image_128x128?: string;
	};
	resource_type: "user";
}

interface AsanaWorkspace {
	gid: string;
	name: string;
	resource_type: "workspace";
}

interface AsanaProject {
	gid: string;
	name: string;
	notes?: string;
	color?: string;
	archived: boolean;
	created_at: string;
	modified_at: string;
	owner?: AsanaUser;
	workspace: AsanaWorkspace;
	resource_type: "project";
}

interface AsanaSection {
	gid: string;
	name: string;
	resource_type: "section";
}

interface AsanaTask {
	gid: string;
	name: string;
	notes?: string;
	completed: boolean;
	completed_at?: string;
	assignee?: AsanaUser | null;
	assignee_status?: "inbox" | "today" | "upcoming" | "later";
	due_on?: string;
	due_at?: string;
	start_on?: string;
	created_at: string;
	modified_at: string;
	projects: AsanaProject[];
	memberships?: Array<{
		project: AsanaProject;
		section: AsanaSection;
	}>;
	tags?: Array<{ gid: string; name: string }>;
	parent?: AsanaTask | null;
	custom_fields?: AsanaCustomField[];
	resource_type: "task";
}

interface AsanaCustomField {
	gid: string;
	name: string;
	type: "text" | "number" | "enum" | "multi_enum";
	enum_value?: { gid: string; name: string; color: string };
	text_value?: string;
	number_value?: number;
}

interface AsanaWebhook {
	gid: string;
	active: boolean;
	resource: {
		gid: string;
		resource_type: string;
		name?: string;
	};
	target: string;
	filters?: Array<{
		resource_type: string;
		resource_subtype?: string;
		action?: string;
		fields?: string[];
	}>;
}

interface AsanaStory {
	gid: string;
	created_at: string;
	created_by: AsanaUser;
	resource_type: "story";
	text: string;
	type: "comment" | "system";
}

// Status mapping: Section names to internal statuses
const ASANA_SECTION_MAP: Record<string, string> = {
	backlog: "backlog",
	"to do": "todo",
	todo: "todo",
	"in progress": "in_progress",
	doing: "in_progress",
	"in review": "in_review",
	review: "in_review",
	blocked: "blocked",
	done: "completed",
	completed: "completed",
	complete: "completed",
};

// Priority mapping (Asana uses custom fields for priority)
const ASANA_PRIORITY_MAP: Record<string, string> = {
	low: "low",
	medium: "medium",
	high: "high",
	urgent: "urgent",
	critical: "urgent",
};

export class AsanaAdapter implements IntegrationAdapter {
	provider = "asana" as const;

	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private webhookSecret?: string;
	private apiBaseUrl = "https://app.asana.com/api/1.0";
	private authBaseUrl = "https://app.asana.com";

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
		// Asana doesn't use scopes in OAuth, access is determined by the app's permissions
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			response_type: "code",
			state,
		});

		return `${this.authBaseUrl}/-/oauth_authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch(`${this.authBaseUrl}/-/oauth_token`, {
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
			refresh_token?: string;
			expires_in?: number;
			token_type?: string;
			data?: {
				id: string;
				name: string;
				email: string;
			};
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Asana OAuth error: ${data.error_description ?? data.error}`,
			);
		}

		// Fetch user info and workspaces
		const userInfo = await this.getCurrentUser(data.access_token!);
		const workspaces = await this.getWorkspaces(data.access_token!);

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			tokenType: data.token_type,
			additionalData: {
				userId: userInfo.gid,
				userName: userInfo.name,
				userEmail: userInfo.email,
				workspaces: workspaces.map((w) => ({ id: w.gid, name: w.name })),
				primaryWorkspaceId: workspaces[0]?.gid,
			},
		};
	}

	async refreshTokens(refreshToken: string): Promise<OAuthCredentials> {
		const response = await fetch(`${this.authBaseUrl}/-/oauth_token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
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
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Asana token refresh error: ${data.error_description ?? data.error}`,
			);
		}

		return {
			accessToken: data.access_token!,
			refreshToken: data.refresh_token ?? refreshToken,
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
		};
	}

	async fetchExternalItems(
		connectionId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]> {
		throw new Error(
			"Use fetchTasks directly with access token and project/workspace ID for Asana integration",
		);
	}

	async pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult> {
		throw new Error(
			"Use createTask/updateTask directly with access token for Asana integration",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		if (!this.webhookSecret) {
			console.warn("Webhook secret not configured for Asana adapter");
			return false;
		}

		// Asana uses HMAC-SHA256 for webhook signatures
		// The signature is in the X-Hook-Signature header
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
			events?: Array<{
				action: string;
				resource: {
					gid: string;
					resource_type: string;
					resource_subtype?: string;
				};
				parent?: {
					gid: string;
					resource_type: string;
				};
				created_at: string;
				user?: {
					gid: string;
					resource_type: string;
				};
				change?: {
					field: string;
					action: string;
					new_value?: unknown;
					added_value?: unknown;
					removed_value?: unknown;
				};
			}>;
		};

		const firstEvent = data.events?.[0];

		return {
			integrationId: "asana",
			eventType: firstEvent?.action ?? "unknown",
			timestamp: firstEvent?.created_at
				? new Date(firstEvent.created_at)
				: new Date(),
			data: data as unknown as Record<string, unknown>,
		};
	}

	// Asana-specific methods

	/**
	 * Make an authenticated API request
	 */
	private async apiRequest<T>(
		accessToken: string,
		endpoint: string,
		options?: RequestInit,
	): Promise<T> {
		const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
				"Content-Type": "application/json",
				...options?.headers,
			},
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`Asana API error: ${response.statusText} - ${errorBody}`);
		}

		const result = (await response.json()) as { data: T };
		return result.data;
	}

	/**
	 * Get current user info
	 */
	async getCurrentUser(accessToken: string): Promise<AsanaUser> {
		return this.apiRequest<AsanaUser>(accessToken, "/users/me");
	}

	/**
	 * Get all workspaces for the authenticated user
	 */
	async getWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
		return this.apiRequest<AsanaWorkspace[]>(accessToken, "/workspaces");
	}

	/**
	 * Get all projects in a workspace
	 */
	async getProjects(
		accessToken: string,
		workspaceId: string,
		options?: { archived?: boolean },
	): Promise<AsanaProject[]> {
		const params = new URLSearchParams({
			workspace: workspaceId,
			opt_fields:
				"name,notes,color,archived,created_at,modified_at,owner,workspace",
		});

		if (options?.archived !== undefined) {
			params.set("archived", String(options.archived));
		}

		return this.apiRequest<AsanaProject[]>(
			accessToken,
			`/projects?${params.toString()}`,
		);
	}

	/**
	 * Get a single project by ID
	 */
	async getProject(
		accessToken: string,
		projectId: string,
	): Promise<AsanaProject> {
		return this.apiRequest<AsanaProject>(
			accessToken,
			`/projects/${projectId}?opt_fields=name,notes,color,archived,created_at,modified_at,owner,workspace`,
		);
	}

	/**
	 * Get sections in a project
	 */
	async getSections(
		accessToken: string,
		projectId: string,
	): Promise<AsanaSection[]> {
		return this.apiRequest<AsanaSection[]>(
			accessToken,
			`/projects/${projectId}/sections`,
		);
	}

	/**
	 * Get tasks in a project
	 */
	async getTasks(
		accessToken: string,
		projectId: string,
		options?: {
			completedSince?: Date;
			modifiedSince?: Date;
		},
	): Promise<AsanaTask[]> {
		const params = new URLSearchParams({
			opt_fields:
				"name,notes,completed,completed_at,assignee,assignee_status,due_on,due_at,start_on,created_at,modified_at,projects,memberships,memberships.section,memberships.project,tags,parent,custom_fields",
		});

		if (options?.completedSince) {
			params.set("completed_since", options.completedSince.toISOString());
		}

		if (options?.modifiedSince) {
			params.set("modified_since", options.modifiedSince.toISOString());
		}

		return this.apiRequest<AsanaTask[]>(
			accessToken,
			`/projects/${projectId}/tasks?${params.toString()}`,
		);
	}

	/**
	 * Get tasks assigned to a user in a workspace
	 */
	async getMyTasks(
		accessToken: string,
		workspaceId: string,
		options?: { completedSince?: Date },
	): Promise<AsanaTask[]> {
		const user = await this.getCurrentUser(accessToken);

		const params = new URLSearchParams({
			assignee: user.gid,
			workspace: workspaceId,
			opt_fields:
				"name,notes,completed,completed_at,assignee,assignee_status,due_on,due_at,start_on,created_at,modified_at,projects,memberships,memberships.section,memberships.project,tags,parent,custom_fields",
		});

		if (options?.completedSince) {
			params.set("completed_since", options.completedSince.toISOString());
		}

		return this.apiRequest<AsanaTask[]>(
			accessToken,
			`/tasks?${params.toString()}`,
		);
	}

	/**
	 * Fetch tasks and convert to ExternalItem format
	 */
	async fetchTasks(
		accessToken: string,
		projectId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]> {
		const tasks = await this.getTasks(accessToken, projectId, {
			modifiedSince: options?.since,
		});

		return tasks.map((task) => this.mapAsanaTaskToExternal(task));
	}

	/**
	 * Get a single task by ID
	 */
	async getTask(accessToken: string, taskId: string): Promise<AsanaTask> {
		return this.apiRequest<AsanaTask>(
			accessToken,
			`/tasks/${taskId}?opt_fields=name,notes,completed,completed_at,assignee,assignee_status,due_on,due_at,start_on,created_at,modified_at,projects,memberships,memberships.section,memberships.project,tags,parent,custom_fields`,
		);
	}

	/**
	 * Create a new task
	 */
	async createTask(
		accessToken: string,
		task: {
			name: string;
			notes?: string;
			projectId: string;
			sectionId?: string;
			assigneeId?: string;
			dueOn?: string;
			startOn?: string;
			tags?: string[];
		},
	): Promise<AsanaTask> {
		const body: Record<string, unknown> = {
			name: task.name,
			projects: [task.projectId],
		};

		if (task.notes) {
			body.notes = task.notes;
		}

		if (task.assigneeId) {
			body.assignee = task.assigneeId;
		}

		if (task.dueOn) {
			body.due_on = task.dueOn;
		}

		if (task.startOn) {
			body.start_on = task.startOn;
		}

		if (task.tags && task.tags.length > 0) {
			body.tags = task.tags;
		}

		const createdTask = await this.apiRequest<AsanaTask>(
			accessToken,
			"/tasks",
			{
				method: "POST",
				body: JSON.stringify({ data: body }),
			},
		);

		// Move to section if specified
		if (task.sectionId) {
			await this.addTaskToSection(accessToken, createdTask.gid, task.sectionId);
		}

		return this.getTask(accessToken, createdTask.gid);
	}

	/**
	 * Update an existing task
	 */
	async updateTask(
		accessToken: string,
		taskId: string,
		updates: {
			name?: string;
			notes?: string;
			completed?: boolean;
			assigneeId?: string | null;
			dueOn?: string | null;
			startOn?: string | null;
		},
	): Promise<AsanaTask> {
		const body: Record<string, unknown> = {};

		if (updates.name !== undefined) {
			body.name = updates.name;
		}

		if (updates.notes !== undefined) {
			body.notes = updates.notes;
		}

		if (updates.completed !== undefined) {
			body.completed = updates.completed;
		}

		if (updates.assigneeId !== undefined) {
			body.assignee = updates.assigneeId;
		}

		if (updates.dueOn !== undefined) {
			body.due_on = updates.dueOn;
		}

		if (updates.startOn !== undefined) {
			body.start_on = updates.startOn;
		}

		return this.apiRequest<AsanaTask>(accessToken, `/tasks/${taskId}`, {
			method: "PUT",
			body: JSON.stringify({ data: body }),
		});
	}

	/**
	 * Delete a task
	 */
	async deleteTask(accessToken: string, taskId: string): Promise<void> {
		await this.apiRequest<Record<string, never>>(
			accessToken,
			`/tasks/${taskId}`,
			{
				method: "DELETE",
			},
		);
	}

	/**
	 * Add a task to a section
	 */
	async addTaskToSection(
		accessToken: string,
		taskId: string,
		sectionId: string,
	): Promise<void> {
		await this.apiRequest<Record<string, never>>(
			accessToken,
			`/sections/${sectionId}/addTask`,
			{
				method: "POST",
				body: JSON.stringify({ data: { task: taskId } }),
			},
		);
	}

	/**
	 * Add a comment (story) to a task
	 */
	async addComment(
		accessToken: string,
		taskId: string,
		text: string,
	): Promise<AsanaStory> {
		return this.apiRequest<AsanaStory>(
			accessToken,
			`/tasks/${taskId}/stories`,
			{
				method: "POST",
				body: JSON.stringify({ data: { text } }),
			},
		);
	}

	/**
	 * Get comments (stories) for a task
	 */
	async getComments(
		accessToken: string,
		taskId: string,
	): Promise<AsanaStory[]> {
		const stories = await this.apiRequest<AsanaStory[]>(
			accessToken,
			`/tasks/${taskId}/stories?opt_fields=created_at,created_by,text,type`,
		);

		// Filter to only comments
		return stories.filter((story) => story.type === "comment");
	}

	/**
	 * Search for users in a workspace
	 */
	async searchUsers(
		accessToken: string,
		workspaceId: string,
		query: string,
	): Promise<AsanaUser[]> {
		const params = new URLSearchParams({
			workspace: workspaceId,
			query,
			opt_fields: "name,email,photo",
		});

		return this.apiRequest<AsanaUser[]>(
			accessToken,
			`/users?${params.toString()}`,
		);
	}

	/**
	 * Register a webhook for a project
	 */
	async registerWebhook(
		accessToken: string,
		resourceId: string,
		targetUrl: string,
		filters?: Array<{
			resource_type: string;
			action?: string;
			fields?: string[];
		}>,
	): Promise<AsanaWebhook> {
		const body: Record<string, unknown> = {
			resource: resourceId,
			target: targetUrl,
		};

		if (filters) {
			body.filters = filters;
		}

		return this.apiRequest<AsanaWebhook>(accessToken, "/webhooks", {
			method: "POST",
			body: JSON.stringify({ data: body }),
		});
	}

	/**
	 * Get all webhooks
	 */
	async getWebhooks(
		accessToken: string,
		workspaceId: string,
	): Promise<AsanaWebhook[]> {
		return this.apiRequest<AsanaWebhook[]>(
			accessToken,
			`/webhooks?workspace=${workspaceId}`,
		);
	}

	/**
	 * Delete a webhook
	 */
	async deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
		await this.apiRequest<Record<string, never>>(
			accessToken,
			`/webhooks/${webhookId}`,
			{
				method: "DELETE",
			},
		);
	}

	/**
	 * Handle Asana webhook handshake (required for webhook registration)
	 * Returns the X-Hook-Secret header value if this is a handshake request
	 */
	handleWebhookHandshake(headers: Record<string, string>): string | null {
		const hookSecret = headers["x-hook-secret"];
		if (hookSecret) {
			// This is a handshake request, return the secret
			return hookSecret;
		}
		return null;
	}

	// Mapping helpers

	/**
	 * Map an Asana task to the internal ExternalItem format
	 */
	mapAsanaTaskToExternal(task: AsanaTask): ExternalItem {
		// Determine status from section name
		const sectionName = task.memberships?.[0]?.section?.name?.toLowerCase();
		const status = task.completed
			? "completed"
			: sectionName
				? (ASANA_SECTION_MAP[sectionName] ?? "backlog")
				: "backlog";

		// Try to find priority from custom fields
		const priorityField = task.custom_fields?.find(
			(f) => f.name.toLowerCase().includes("priority") && f.type === "enum",
		);
		const priority = priorityField?.enum_value?.name
			? (ASANA_PRIORITY_MAP[priorityField.enum_value.name.toLowerCase()] ??
				"medium")
			: "medium";

		return {
			externalId: task.gid,
			type: "task",
			data: {
				title: task.name,
				description: task.notes,
				status,
				priority,
				completed: task.completed,
				completedAt: task.completed_at,
				assigneeId: task.assignee?.gid,
				assigneeName: task.assignee?.name,
				assigneeEmail: task.assignee?.email,
				dueDate: task.due_on ?? task.due_at,
				startDate: task.start_on,
				createdAt: task.created_at,
				updatedAt: task.modified_at,
				projectId: task.projects[0]?.gid,
				projectName: task.projects[0]?.name,
				sectionId: task.memberships?.[0]?.section?.gid,
				sectionName: task.memberships?.[0]?.section?.name,
				tags: task.tags?.map((t) => t.name),
				parentId: task.parent?.gid,
			},
			metadata: {
				asanaTaskId: task.gid,
				asanaProjectId: task.projects[0]?.gid,
				asanaSectionId: task.memberships?.[0]?.section?.gid,
				asanaUrl: `https://app.asana.com/0/${task.projects[0]?.gid}/${task.gid}`,
				customFields: task.custom_fields?.reduce(
					(acc, field) => {
						acc[field.name] =
							field.enum_value?.name ?? field.text_value ?? field.number_value;
						return acc;
					},
					{} as Record<string, unknown>,
				),
			},
		};
	}

	/**
	 * Map section name to internal status
	 */
	mapSectionToStatus(sectionName: string): string {
		return ASANA_SECTION_MAP[sectionName.toLowerCase()] ?? "backlog";
	}

	/**
	 * Handle webhook event and map to internal format
	 */
	handleWebhookEvent(payload: WebhookPayload): {
		action: "created" | "updated" | "deleted" | "unknown";
		taskId?: string;
		changes?: Array<{ field: string; action: string; value?: unknown }>;
	} {
		const data = payload.data as {
			events?: Array<{
				action: string;
				resource: {
					gid: string;
					resource_type: string;
				};
				change?: {
					field: string;
					action: string;
					new_value?: unknown;
					added_value?: unknown;
					removed_value?: unknown;
				};
			}>;
		};

		const events = data.events ?? [];
		const taskEvents = events.filter(
			(e) => e.resource.resource_type === "task",
		);

		if (taskEvents.length === 0) {
			return { action: "unknown" };
		}

		const firstEvent = taskEvents[0];
		let action: "created" | "updated" | "deleted" | "unknown" = "unknown";

		switch (firstEvent.action) {
			case "added":
				action = "created";
				break;
			case "changed":
				action = "updated";
				break;
			case "removed":
			case "deleted":
				action = "deleted";
				break;
		}

		const changes = taskEvents
			.filter((e) => e.change)
			.map((e) => ({
				field: e.change!.field,
				action: e.change!.action,
				value: e.change!.new_value ?? e.change!.added_value,
			}));

		return {
			action,
			taskId: firstEvent.resource.gid,
			changes: changes.length > 0 ? changes : undefined,
		};
	}
}
