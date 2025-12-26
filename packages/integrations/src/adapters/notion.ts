// ============================================
// NOTION ADAPTER - Notion integration
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

// Notion API types
interface NotionUser {
	id: string;
	name?: string;
	avatar_url?: string;
	type: "person" | "bot";
	person?: {
		email?: string;
	};
}

interface NotionDatabase {
	id: string;
	title: Array<{ plain_text: string }>;
	description: Array<{ plain_text: string }>;
	properties: Record<string, NotionProperty>;
	url: string;
	created_time: string;
	last_edited_time: string;
}

interface NotionProperty {
	id: string;
	name: string;
	type: string;
	[key: string]: unknown;
}

interface NotionPage {
	id: string;
	parent: {
		type: "database_id" | "page_id" | "workspace";
		database_id?: string;
		page_id?: string;
	};
	properties: Record<string, NotionPropertyValue>;
	url: string;
	created_time: string;
	last_edited_time: string;
	archived: boolean;
}

interface NotionPropertyValue {
	id: string;
	type: string;
	title?: Array<{ plain_text: string }>;
	rich_text?: Array<{ plain_text: string }>;
	number?: number | null;
	select?: { id: string; name: string; color: string } | null;
	multi_select?: Array<{ id: string; name: string; color: string }>;
	date?: { start: string; end?: string; time_zone?: string } | null;
	checkbox?: boolean;
	url?: string | null;
	email?: string | null;
	phone_number?: string | null;
	status?: { id: string; name: string; color: string } | null;
	people?: Array<NotionUser>;
	[key: string]: unknown;
}

interface NotionSearchResult {
	object: "list";
	results: Array<NotionDatabase | NotionPage>;
	has_more: boolean;
	next_cursor: string | null;
}

interface NotionBlock {
	id: string;
	type: string;
	[key: string]: unknown;
}

// Task property mapping configuration
interface TaskPropertyMapping {
	titleProperty: string;
	descriptionProperty?: string;
	statusProperty?: string;
	priorityProperty?: string;
	dueDateProperty?: string;
	assigneeProperty?: string;
	statusMapping?: Record<string, string>;
	priorityMapping?: Record<string, string>;
}

export class NotionAdapter implements IntegrationAdapter {
	provider = "notion" as const;

	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private apiBaseUrl = "https://api.notion.com/v1";
	private authBaseUrl = "https://api.notion.com/v1/oauth";
	private notionVersion = "2022-06-28";

	constructor(config: {
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.redirectUri = config.redirectUri;
	}

	getAuthorizationUrl(state: string, _scopes?: string[]): string {
		// Notion OAuth doesn't support custom scopes - permissions are set in the integration settings
		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			owner: "user",
			redirect_uri: this.redirectUri,
			state,
		});

		return `${this.authBaseUrl}/authorize?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const credentials = Buffer.from(
			`${this.clientId}:${this.clientSecret}`,
		).toString("base64");

		const response = await fetch(`${this.authBaseUrl}/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${credentials}`,
			},
			body: JSON.stringify({
				grant_type: "authorization_code",
				code,
				redirect_uri: this.redirectUri,
			}),
		});

		const data = (await response.json()) as {
			access_token?: string;
			token_type?: string;
			bot_id?: string;
			workspace_id?: string;
			workspace_name?: string;
			workspace_icon?: string;
			owner?: {
				type: string;
				user?: NotionUser;
			};
			duplicated_template_id?: string;
			error?: string;
		};

		if (data.error) {
			throw new Error(`Notion OAuth error: ${data.error}`);
		}

		return {
			accessToken: data.access_token!,
			// Notion tokens don't expire and don't have refresh tokens
			tokenType: data.token_type,
			additionalData: {
				botId: data.bot_id,
				workspaceId: data.workspace_id,
				workspaceName: data.workspace_name,
				workspaceIcon: data.workspace_icon,
				ownerId: data.owner?.user?.id,
				ownerName: data.owner?.user?.name,
				ownerEmail: data.owner?.user?.person?.email,
			},
		};
	}

	async refreshTokens(_refreshToken: string): Promise<OAuthCredentials> {
		// Notion tokens don't expire and don't support refresh
		throw new Error(
			"Notion tokens do not expire and do not support refresh. Re-authenticate if access is revoked.",
		);
	}

	async fetchExternalItems(
		connectionId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]> {
		// This would need access to the connection's credentials
		// In practice, this would be called with credentials from storage
		throw new Error(
			"fetchExternalItems requires credentials - use fetchDatabases or fetchPages directly",
		);
	}

	async pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult> {
		// This would need access to the connection's credentials and database mapping
		throw new Error(
			"pushToExternal requires credentials and database mapping - use createPage directly",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		// Notion uses webhook verification differently - they send a verification challenge
		// For ongoing requests, there's no signature verification (security is based on the webhook URL being secret)
		// However, we can implement a simple HMAC verification if a signing secret is configured
		try {
			const data = JSON.parse(payload);
			// Check if this is a verification challenge
			if (data.type === "url_verification") {
				return true;
			}
			// For actual events, Notion doesn't provide a signature mechanism
			// Security relies on the webhook URL being kept secret
			return true;
		} catch {
			return false;
		}
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		const data = JSON.parse(payload);

		return {
			integrationId: "notion",
			eventType: data.type ?? "unknown",
			timestamp: new Date(),
			data,
		};
	}

	// Notion-specific methods

	/**
	 * Create headers for Notion API requests
	 */
	private getHeaders(accessToken: string): Record<string, string> {
		return {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			"Notion-Version": this.notionVersion,
		};
	}

	/**
	 * Search for databases and pages
	 */
	async search(
		accessToken: string,
		options?: {
			query?: string;
			filter?: { property: "object"; value: "database" | "page" };
			sort?: { direction: "ascending" | "descending"; timestamp: "last_edited_time" };
			startCursor?: string;
			pageSize?: number;
		},
	): Promise<NotionSearchResult> {
		const response = await fetch(`${this.apiBaseUrl}/search`, {
			method: "POST",
			headers: this.getHeaders(accessToken),
			body: JSON.stringify({
				query: options?.query,
				filter: options?.filter,
				sort: options?.sort,
				start_cursor: options?.startCursor,
				page_size: options?.pageSize ?? 100,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion search error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionSearchResult>;
	}

	/**
	 * Fetch all accessible databases
	 */
	async fetchDatabases(accessToken: string): Promise<NotionDatabase[]> {
		const result = await this.search(accessToken, {
			filter: { property: "object", value: "database" },
		});

		return result.results as NotionDatabase[];
	}

	/**
	 * Get a specific database
	 */
	async getDatabase(
		accessToken: string,
		databaseId: string,
	): Promise<NotionDatabase> {
		const response = await fetch(
			`${this.apiBaseUrl}/databases/${databaseId}`,
			{
				method: "GET",
				headers: this.getHeaders(accessToken),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion get database error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionDatabase>;
	}

	/**
	 * Query a database for pages
	 */
	async queryDatabase(
		accessToken: string,
		databaseId: string,
		options?: {
			filter?: Record<string, unknown>;
			sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
			startCursor?: string;
			pageSize?: number;
		},
	): Promise<{ results: NotionPage[]; hasMore: boolean; nextCursor: string | null }> {
		const response = await fetch(
			`${this.apiBaseUrl}/databases/${databaseId}/query`,
			{
				method: "POST",
				headers: this.getHeaders(accessToken),
				body: JSON.stringify({
					filter: options?.filter,
					sorts: options?.sorts,
					start_cursor: options?.startCursor,
					page_size: options?.pageSize ?? 100,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion query database error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			results: NotionPage[];
			has_more: boolean;
			next_cursor: string | null;
		};

		return {
			results: data.results,
			hasMore: data.has_more,
			nextCursor: data.next_cursor,
		};
	}

	/**
	 * Get a specific page
	 */
	async getPage(accessToken: string, pageId: string): Promise<NotionPage> {
		const response = await fetch(`${this.apiBaseUrl}/pages/${pageId}`, {
			method: "GET",
			headers: this.getHeaders(accessToken),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion get page error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionPage>;
	}

	/**
	 * Create a page in a database
	 */
	async createPage(
		accessToken: string,
		databaseId: string,
		properties: Record<string, NotionPropertyValue>,
		children?: NotionBlock[],
	): Promise<NotionPage> {
		const response = await fetch(`${this.apiBaseUrl}/pages`, {
			method: "POST",
			headers: this.getHeaders(accessToken),
			body: JSON.stringify({
				parent: {
					database_id: databaseId,
				},
				properties,
				children,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion create page error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionPage>;
	}

	/**
	 * Update a page's properties
	 */
	async updatePage(
		accessToken: string,
		pageId: string,
		properties: Record<string, NotionPropertyValue>,
		archived?: boolean,
	): Promise<NotionPage> {
		const response = await fetch(`${this.apiBaseUrl}/pages/${pageId}`, {
			method: "PATCH",
			headers: this.getHeaders(accessToken),
			body: JSON.stringify({
				properties,
				archived,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion update page error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionPage>;
	}

	/**
	 * Archive (soft delete) a page
	 */
	async archivePage(accessToken: string, pageId: string): Promise<NotionPage> {
		return this.updatePage(accessToken, pageId, {}, true);
	}

	/**
	 * Get page content (blocks)
	 */
	async getPageContent(
		accessToken: string,
		pageId: string,
		startCursor?: string,
	): Promise<{ results: NotionBlock[]; hasMore: boolean; nextCursor: string | null }> {
		const params = new URLSearchParams();
		if (startCursor) {
			params.set("start_cursor", startCursor);
		}
		params.set("page_size", "100");

		const response = await fetch(
			`${this.apiBaseUrl}/blocks/${pageId}/children?${params.toString()}`,
			{
				method: "GET",
				headers: this.getHeaders(accessToken),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion get page content error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			results: NotionBlock[];
			has_more: boolean;
			next_cursor: string | null;
		};

		return {
			results: data.results,
			hasMore: data.has_more,
			nextCursor: data.next_cursor,
		};
	}

	/**
	 * Append content blocks to a page
	 */
	async appendPageContent(
		accessToken: string,
		pageId: string,
		children: NotionBlock[],
	): Promise<{ results: NotionBlock[] }> {
		const response = await fetch(
			`${this.apiBaseUrl}/blocks/${pageId}/children`,
			{
				method: "PATCH",
				headers: this.getHeaders(accessToken),
				body: JSON.stringify({
					children,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion append content error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<{ results: NotionBlock[] }>;
	}

	// Task sync helpers

	/**
	 * Create a task page in Notion with mapped properties
	 */
	async createTaskPage(
		accessToken: string,
		databaseId: string,
		task: {
			id: string;
			title: string;
			description?: string;
			status?: string;
			priority?: string;
			dueDate?: Date;
			assigneeEmail?: string;
			url?: string;
		},
		mapping: TaskPropertyMapping,
	): Promise<NotionPage> {
		const properties: Record<string, NotionPropertyValue> = {
			[mapping.titleProperty]: {
				id: "",
				type: "title",
				title: [
					{
						plain_text: task.title,
					},
				],
			} as NotionPropertyValue,
		};

		// Add description if mapped
		if (mapping.descriptionProperty && task.description) {
			properties[mapping.descriptionProperty] = {
				id: "",
				type: "rich_text",
				rich_text: [
					{
						plain_text: task.description,
					},
				],
			} as NotionPropertyValue;
		}

		// Add status if mapped
		if (mapping.statusProperty && task.status) {
			const mappedStatus = mapping.statusMapping?.[task.status] ?? task.status;
			properties[mapping.statusProperty] = {
				id: "",
				type: "status",
				status: {
					id: "",
					name: mappedStatus,
					color: "default",
				},
			} as NotionPropertyValue;
		}

		// Add priority if mapped
		if (mapping.priorityProperty && task.priority) {
			const mappedPriority =
				mapping.priorityMapping?.[task.priority] ?? task.priority;
			properties[mapping.priorityProperty] = {
				id: "",
				type: "select",
				select: {
					id: "",
					name: mappedPriority,
					color: "default",
				},
			} as NotionPropertyValue;
		}

		// Add due date if mapped
		if (mapping.dueDateProperty && task.dueDate) {
			properties[mapping.dueDateProperty] = {
				id: "",
				type: "date",
				date: {
					start: task.dueDate.toISOString().split("T")[0],
				},
			} as NotionPropertyValue;
		}

		// Create content blocks with description and link
		const children: NotionBlock[] = [];

		if (task.description) {
			children.push({
				id: "",
				type: "paragraph",
				paragraph: {
					rich_text: [
						{
							type: "text",
							text: {
								content: task.description,
							},
						},
					],
				},
			});
		}

		if (task.url) {
			children.push({
				id: "",
				type: "callout",
				callout: {
					icon: {
						type: "emoji",
						emoji: "link",
					},
					rich_text: [
						{
							type: "text",
							text: {
								content: "View in GrandPlan: ",
							},
						},
						{
							type: "text",
							text: {
								content: task.url,
								link: {
									url: task.url,
								},
							},
						},
					],
				},
			});
		}

		return this.createPage(
			accessToken,
			databaseId,
			properties,
			children.length > 0 ? children : undefined,
		);
	}

	/**
	 * Update a task page in Notion with mapped properties
	 */
	async updateTaskPage(
		accessToken: string,
		pageId: string,
		task: {
			title?: string;
			description?: string;
			status?: string;
			priority?: string;
			dueDate?: Date | null;
		},
		mapping: TaskPropertyMapping,
	): Promise<NotionPage> {
		const properties: Record<string, NotionPropertyValue> = {};

		if (task.title !== undefined) {
			properties[mapping.titleProperty] = {
				id: "",
				type: "title",
				title: [
					{
						plain_text: task.title,
					},
				],
			} as NotionPropertyValue;
		}

		if (mapping.descriptionProperty && task.description !== undefined) {
			properties[mapping.descriptionProperty] = {
				id: "",
				type: "rich_text",
				rich_text: task.description
					? [
							{
								plain_text: task.description,
							},
						]
					: [],
			} as NotionPropertyValue;
		}

		if (mapping.statusProperty && task.status !== undefined) {
			const mappedStatus = mapping.statusMapping?.[task.status] ?? task.status;
			properties[mapping.statusProperty] = {
				id: "",
				type: "status",
				status: {
					id: "",
					name: mappedStatus,
					color: "default",
				},
			} as NotionPropertyValue;
		}

		if (mapping.priorityProperty && task.priority !== undefined) {
			const mappedPriority =
				mapping.priorityMapping?.[task.priority] ?? task.priority;
			properties[mapping.priorityProperty] = {
				id: "",
				type: "select",
				select: {
					id: "",
					name: mappedPriority,
					color: "default",
				},
			} as NotionPropertyValue;
		}

		if (mapping.dueDateProperty && task.dueDate !== undefined) {
			properties[mapping.dueDateProperty] = {
				id: "",
				type: "date",
				date: task.dueDate
					? {
							start: task.dueDate.toISOString().split("T")[0],
						}
					: null,
			} as NotionPropertyValue;
		}

		return this.updatePage(accessToken, pageId, properties);
	}

	/**
	 * Parse a Notion page into a task-like structure
	 */
	parsePageAsTask(
		page: NotionPage,
		mapping: TaskPropertyMapping,
	): {
		notionPageId: string;
		notionUrl: string;
		title: string;
		description?: string;
		status?: string;
		priority?: string;
		dueDate?: Date;
		lastEditedTime: Date;
	} {
		const getPropertyText = (
			prop: NotionPropertyValue | undefined,
		): string | undefined => {
			if (!prop) return undefined;

			switch (prop.type) {
				case "title":
					return prop.title?.map((t) => t.plain_text).join("") || undefined;
				case "rich_text":
					return prop.rich_text?.map((t) => t.plain_text).join("") || undefined;
				case "select":
					return prop.select?.name;
				case "status":
					return prop.status?.name;
				default:
					return undefined;
			}
		};

		const getPropertyDate = (
			prop: NotionPropertyValue | undefined,
		): Date | undefined => {
			if (!prop || prop.type !== "date" || !prop.date?.start) {
				return undefined;
			}
			return new Date(prop.date.start);
		};

		// Reverse map status/priority if mappings exist
		const reverseMap = (
			value: string | undefined,
			mapping: Record<string, string> | undefined,
		): string | undefined => {
			if (!value || !mapping) return value;
			const entry = Object.entries(mapping).find(([_, v]) => v === value);
			return entry ? entry[0] : value;
		};

		const status = getPropertyText(page.properties[mapping.statusProperty ?? ""]);
		const priority = getPropertyText(
			page.properties[mapping.priorityProperty ?? ""],
		);

		return {
			notionPageId: page.id,
			notionUrl: page.url,
			title:
				getPropertyText(page.properties[mapping.titleProperty]) ?? "Untitled",
			description: mapping.descriptionProperty
				? getPropertyText(page.properties[mapping.descriptionProperty])
				: undefined,
			status: reverseMap(status, mapping.statusMapping),
			priority: reverseMap(priority, mapping.priorityMapping),
			dueDate: mapping.dueDateProperty
				? getPropertyDate(page.properties[mapping.dueDateProperty])
				: undefined,
			lastEditedTime: new Date(page.last_edited_time),
		};
	}

	/**
	 * Fetch changes from a database since a given time
	 */
	async fetchDatabaseChanges(
		accessToken: string,
		databaseId: string,
		since: Date,
	): Promise<NotionPage[]> {
		const { results } = await this.queryDatabase(accessToken, databaseId, {
			filter: {
				timestamp: "last_edited_time",
				last_edited_time: {
					on_or_after: since.toISOString(),
				},
			},
			sorts: [
				{
					property: "last_edited_time",
					direction: "descending",
				},
			],
		});

		return results;
	}

	/**
	 * Get the current user (bot)
	 */
	async getCurrentUser(accessToken: string): Promise<NotionUser> {
		const response = await fetch(`${this.apiBaseUrl}/users/me`, {
			method: "GET",
			headers: this.getHeaders(accessToken),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion get current user error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<NotionUser>;
	}

	/**
	 * List all users in the workspace
	 */
	async listUsers(
		accessToken: string,
		startCursor?: string,
	): Promise<{ results: NotionUser[]; hasMore: boolean; nextCursor: string | null }> {
		const params = new URLSearchParams();
		if (startCursor) {
			params.set("start_cursor", startCursor);
		}
		params.set("page_size", "100");

		const response = await fetch(
			`${this.apiBaseUrl}/users?${params.toString()}`,
			{
				method: "GET",
				headers: this.getHeaders(accessToken),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Notion list users error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			results: NotionUser[];
			has_more: boolean;
			next_cursor: string | null;
		};

		return {
			results: data.results,
			hasMore: data.has_more,
			nextCursor: data.next_cursor,
		};
	}
}
