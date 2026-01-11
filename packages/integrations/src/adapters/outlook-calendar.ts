// ============================================
// OUTLOOK CALENDAR ADAPTER - Microsoft Outlook Calendar integration
// ============================================

import { randomBytes } from "node:crypto";
import type {
	ExternalItem,
	IntegrationAdapter,
	InternalItem,
	OAuthCredentials,
	SyncResult,
	WebhookPayload,
} from "../types.js";

// Microsoft Graph Calendar API types
interface OutlookCalendar {
	id: string;
	name: string;
	color: string;
	changeKey: string;
	canShare: boolean;
	canViewPrivateItems: boolean;
	canEdit: boolean;
	isDefaultCalendar: boolean;
	owner?: {
		name: string;
		address: string;
	};
}

interface OutlookEvent {
	id: string;
	subject: string;
	body: {
		contentType: "text" | "html";
		content: string;
	};
	bodyPreview: string;
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	location?: {
		displayName: string;
		address?: {
			street?: string;
			city?: string;
			state?: string;
			countryOrRegion?: string;
			postalCode?: string;
		};
	};
	isAllDay: boolean;
	isCancelled: boolean;
	isOrganizer: boolean;
	responseRequested: boolean;
	showAs:
		| "free"
		| "tentative"
		| "busy"
		| "oof"
		| "workingElsewhere"
		| "unknown";
	importance: "low" | "normal" | "high";
	sensitivity: "normal" | "personal" | "private" | "confidential";
	categories: string[];
	webLink: string;
	onlineMeetingUrl?: string;
	isOnlineMeeting: boolean;
	onlineMeeting?: {
		joinUrl: string;
	};
	createdDateTime: string;
	lastModifiedDateTime: string;
	organizer: {
		emailAddress: {
			name: string;
			address: string;
		};
	};
	attendees?: Array<{
		type: "required" | "optional" | "resource";
		status: {
			response:
				| "none"
				| "organizer"
				| "tentativelyAccepted"
				| "accepted"
				| "declined"
				| "notResponded";
			time: string;
		};
		emailAddress: {
			name: string;
			address: string;
		};
	}>;
	recurrence?: {
		pattern: {
			type:
				| "daily"
				| "weekly"
				| "absoluteMonthly"
				| "relativeMonthly"
				| "absoluteYearly"
				| "relativeYearly";
			interval: number;
			daysOfWeek?: string[];
			dayOfMonth?: number;
			firstDayOfWeek?: string;
		};
		range: {
			type: "endDate" | "noEnd" | "numbered";
			startDate: string;
			endDate?: string;
			numberOfOccurrences?: number;
		};
	};
	seriesMasterId?: string;
	type: "singleInstance" | "occurrence" | "exception" | "seriesMaster";
	reminderMinutesBeforeStart: number;
	isReminderOn: boolean;
	singleValueExtendedProperties?: Array<{
		id: string;
		value: string;
	}>;
}

interface OutlookUser {
	id: string;
	displayName: string;
	mail?: string;
	userPrincipalName: string;
}

interface GraphSubscription {
	id: string;
	resource: string;
	applicationId: string;
	changeType: string;
	clientState: string;
	notificationUrl: string;
	expirationDateTime: string;
	creatorId: string;
}

interface GraphChangeNotification {
	subscriptionId: string;
	subscriptionExpirationDateTime: string;
	changeType: "created" | "updated" | "deleted";
	resource: string;
	resourceData?: {
		"@odata.type": string;
		"@odata.id": string;
		"@odata.etag": string;
		id: string;
	};
	clientState: string;
	tenantId: string;
}

export class OutlookCalendarAdapter implements IntegrationAdapter {
	provider = "outlook_calendar" as const;

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
			"email",
			"offline_access",
			"User.Read",
			"Calendars.ReadWrite",
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
				`Outlook OAuth error: ${data.error_description ?? data.error}`,
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
				`Outlook token refresh error: ${data.error_description ?? data.error}`,
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
		_connectionId: string,
		_options?: { since?: Date },
	): Promise<ExternalItem[]> {
		// This would need access to the connection's credentials
		throw new Error(
			"fetchExternalItems requires credentials - use fetchEvents directly",
		);
	}

	async pushToExternal(
		_connectionId: string,
		_items: InternalItem[],
	): Promise<SyncResult> {
		// This would need access to the connection's credentials
		throw new Error(
			"pushToExternal requires credentials - use createEvent directly",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		// Microsoft Graph webhooks use clientState for verification
		// The clientState is set when creating the subscription and
		// included in every notification
		try {
			const data = JSON.parse(payload) as {
				value?: GraphChangeNotification[];
				validationToken?: string;
			};

			// For validation requests, just check structure
			if (data.validationToken) {
				return true;
			}

			// For notifications, verify clientState matches
			if (data.value && data.value.length > 0) {
				// Compare clientState with expected value (signature parameter)
				return data.value.every((n) => n.clientState === signature);
			}

			return false;
		} catch {
			return false;
		}
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		const data = JSON.parse(payload) as {
			value?: GraphChangeNotification[];
			validationToken?: string;
		};

		// Handle validation request
		if (data.validationToken) {
			return {
				integrationId: "outlook_calendar",
				eventType: "validation",
				timestamp: new Date(),
				data: { validationToken: data.validationToken },
			};
		}

		// Handle change notifications
		const notifications = data.value ?? [];

		return {
			integrationId: "outlook_calendar",
			eventType: notifications[0]?.changeType ?? "unknown",
			timestamp: new Date(),
			data: { notifications },
		};
	}

	// Outlook Calendar-specific methods

	/**
	 * Fetch user info from Graph API
	 */
	private async fetchUserInfo(accessToken: string): Promise<OutlookUser> {
		const response = await fetch(`${this.graphBaseUrl}/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user info: ${response.statusText}`);
		}

		return response.json() as Promise<OutlookUser>;
	}

	/**
	 * List all calendars
	 */
	async listCalendars(accessToken: string): Promise<OutlookCalendar[]> {
		const response = await fetch(`${this.graphBaseUrl}/me/calendars`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook list calendars error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as { value: OutlookCalendar[] };
		return data.value;
	}

	/**
	 * Get the default calendar
	 */
	async getDefaultCalendar(accessToken: string): Promise<OutlookCalendar> {
		const response = await fetch(`${this.graphBaseUrl}/me/calendar`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Outlook get default calendar error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<OutlookCalendar>;
	}

	/**
	 * Fetch calendar events
	 */
	async fetchEvents(
		accessToken: string,
		calendarId?: string, // null for default calendar
		options?: {
			startDateTime?: Date;
			endDateTime?: Date;
			top?: number;
			skip?: number;
			orderBy?: string;
			filter?: string;
			select?: string[];
		},
	): Promise<{
		events: OutlookEvent[];
		nextLink?: string;
	}> {
		const baseUrl = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events`
			: `${this.graphBaseUrl}/me/calendar/events`;

		const params = new URLSearchParams();

		if (options?.startDateTime && options?.endDateTime) {
			// Use calendar view for date range queries
			const viewUrl = calendarId
				? `${this.graphBaseUrl}/me/calendars/${calendarId}/calendarView`
				: `${this.graphBaseUrl}/me/calendar/calendarView`;

			params.set("startDateTime", options.startDateTime.toISOString());
			params.set("endDateTime", options.endDateTime.toISOString());

			if (options?.top) {
				params.set("$top", options.top.toString());
			}
			if (options?.skip) {
				params.set("$skip", options.skip.toString());
			}
			if (options?.orderBy) {
				params.set("$orderby", options.orderBy);
			}
			if (options?.select) {
				params.set("$select", options.select.join(","));
			}

			const response = await fetch(`${viewUrl}?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Prefer: 'outlook.timezone="UTC"',
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(`Outlook fetch events error: ${JSON.stringify(error)}`);
			}

			const data = (await response.json()) as {
				value: OutlookEvent[];
				"@odata.nextLink"?: string;
			};

			return {
				events: data.value,
				nextLink: data["@odata.nextLink"],
			};
		}

		// Non-calendar view query
		if (options?.top) {
			params.set("$top", options.top.toString());
		}
		if (options?.skip) {
			params.set("$skip", options.skip.toString());
		}
		if (options?.orderBy) {
			params.set("$orderby", options.orderBy);
		}
		if (options?.filter) {
			params.set("$filter", options.filter);
		}
		if (options?.select) {
			params.set("$select", options.select.join(","));
		}

		const response = await fetch(`${baseUrl}?${params.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Prefer: 'outlook.timezone="UTC"',
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook fetch events error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			value: OutlookEvent[];
			"@odata.nextLink"?: string;
		};

		return {
			events: data.value,
			nextLink: data["@odata.nextLink"],
		};
	}

	/**
	 * Get a specific event
	 */
	async getEvent(
		accessToken: string,
		eventId: string,
		calendarId?: string,
	): Promise<OutlookEvent> {
		const url = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events/${eventId}`
			: `${this.graphBaseUrl}/me/calendar/events/${eventId}`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Prefer: 'outlook.timezone="UTC"',
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook get event error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<OutlookEvent>;
	}

	/**
	 * Create a calendar event
	 */
	async createEvent(
		accessToken: string,
		event: {
			subject: string;
			body?: {
				contentType: "text" | "html";
				content: string;
			};
			start: {
				dateTime: string;
				timeZone: string;
			};
			end: {
				dateTime: string;
				timeZone: string;
			};
			location?: {
				displayName: string;
			};
			attendees?: Array<{
				emailAddress: {
					address: string;
					name?: string;
				};
				type: "required" | "optional";
			}>;
			isAllDay?: boolean;
			importance?: "low" | "normal" | "high";
			showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere";
			reminderMinutesBeforeStart?: number;
			isReminderOn?: boolean;
			categories?: string[];
			isOnlineMeeting?: boolean;
			onlineMeetingProvider?:
				| "teamsForBusiness"
				| "skypeForBusiness"
				| "skypeForConsumer";
			singleValueExtendedProperties?: Array<{
				id: string;
				value: string;
			}>;
		},
		calendarId?: string,
	): Promise<OutlookEvent> {
		const url = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events`
			: `${this.graphBaseUrl}/me/calendar/events`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				Prefer: 'outlook.timezone="UTC"',
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook create event error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<OutlookEvent>;
	}

	/**
	 * Update a calendar event
	 */
	async updateEvent(
		accessToken: string,
		eventId: string,
		event: Partial<{
			subject: string;
			body: {
				contentType: "text" | "html";
				content: string;
			};
			start: {
				dateTime: string;
				timeZone: string;
			};
			end: {
				dateTime: string;
				timeZone: string;
			};
			location: {
				displayName: string;
			};
			attendees: Array<{
				emailAddress: {
					address: string;
					name?: string;
				};
				type: "required" | "optional";
			}>;
			isAllDay: boolean;
			importance: "low" | "normal" | "high";
			showAs: "free" | "tentative" | "busy" | "oof" | "workingElsewhere";
			reminderMinutesBeforeStart: number;
			isReminderOn: boolean;
			categories: string[];
			isCancelled: boolean;
		}>,
		calendarId?: string,
	): Promise<OutlookEvent> {
		const url = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events/${eventId}`
			: `${this.graphBaseUrl}/me/calendar/events/${eventId}`;

		const response = await fetch(url, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				Prefer: 'outlook.timezone="UTC"',
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook update event error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<OutlookEvent>;
	}

	/**
	 * Delete a calendar event
	 */
	async deleteEvent(
		accessToken: string,
		eventId: string,
		calendarId?: string,
	): Promise<void> {
		const url = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events/${eventId}`
			: `${this.graphBaseUrl}/me/calendar/events/${eventId}`;

		const response = await fetch(url, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok && response.status !== 404) {
			const error = await response.json();
			throw new Error(`Outlook delete event error: ${JSON.stringify(error)}`);
		}
	}

	/**
	 * Cancel an event (for organizer)
	 */
	async cancelEvent(
		accessToken: string,
		eventId: string,
		comment?: string,
		calendarId?: string,
	): Promise<void> {
		const url = calendarId
			? `${this.graphBaseUrl}/me/calendars/${calendarId}/events/${eventId}/cancel`
			: `${this.graphBaseUrl}/me/calendar/events/${eventId}/cancel`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				comment,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook cancel event error: ${JSON.stringify(error)}`);
		}
	}

	// Task-to-event sync helpers

	/**
	 * Create a calendar event from a task
	 */
	async createEventFromTask(
		accessToken: string,
		task: {
			id: string;
			title: string;
			description?: string;
			dueDate: Date;
			duration?: number; // minutes, defaults to 60
			priority?: string;
			url?: string;
		},
		calendarId?: string,
	): Promise<OutlookEvent> {
		const duration = task.duration ?? 60;
		const endDate = new Date(task.dueDate.getTime() + duration * 60 * 1000);

		const bodyContent = [
			task.description ?? "",
			"",
			`Priority: ${task.priority ?? "Normal"}`,
			task.url ? `View in GrandPlan: ${task.url}` : "",
		]
			.filter(Boolean)
			.join("\n");

		const importance: "low" | "normal" | "high" =
			task.priority === "urgent" || task.priority === "high"
				? "high"
				: task.priority === "low"
					? "low"
					: "normal";

		// Create custom property ID for storing GrandPlan task ID
		// Using String namespace GUID format
		const grandplanPropertyId =
			"String {00000000-0000-0000-0000-000000000000} Name GrandPlanTaskId";

		return this.createEvent(
			accessToken,
			{
				subject: task.title,
				body: {
					contentType: "text",
					content: bodyContent,
				},
				start: {
					dateTime: task.dueDate.toISOString().replace("Z", ""),
					timeZone: "UTC",
				},
				end: {
					dateTime: endDate.toISOString().replace("Z", ""),
					timeZone: "UTC",
				},
				importance,
				isReminderOn: true,
				reminderMinutesBeforeStart: 30,
				categories: ["GrandPlan Task"],
				singleValueExtendedProperties: [
					{
						id: grandplanPropertyId,
						value: task.id,
					},
				],
			},
			calendarId,
		);
	}

	/**
	 * Update a calendar event from task changes
	 */
	async updateEventFromTask(
		accessToken: string,
		eventId: string,
		task: {
			title?: string;
			description?: string;
			dueDate?: Date;
			duration?: number;
			priority?: string;
			url?: string;
			completed?: boolean;
		},
		calendarId?: string,
	): Promise<OutlookEvent> {
		const updates: Parameters<typeof this.updateEvent>[2] = {};

		if (task.title !== undefined) {
			updates.subject = task.title;
		}

		if (task.description !== undefined || task.priority !== undefined) {
			const bodyContent = [
				task.description ?? "",
				"",
				task.priority ? `Priority: ${task.priority}` : "",
				task.url ? `View in GrandPlan: ${task.url}` : "",
			]
				.filter(Boolean)
				.join("\n");
			updates.body = {
				contentType: "text",
				content: bodyContent,
			};
		}

		if (task.dueDate !== undefined) {
			const duration = task.duration ?? 60;
			const endDate = new Date(task.dueDate.getTime() + duration * 60 * 1000);

			updates.start = {
				dateTime: task.dueDate.toISOString().replace("Z", ""),
				timeZone: "UTC",
			};
			updates.end = {
				dateTime: endDate.toISOString().replace("Z", ""),
				timeZone: "UTC",
			};
		}

		if (task.priority !== undefined) {
			updates.importance =
				task.priority === "urgent" || task.priority === "high"
					? "high"
					: task.priority === "low"
						? "low"
						: "normal";
		}

		if (task.completed !== undefined) {
			updates.isCancelled = task.completed;
		}

		return this.updateEvent(accessToken, eventId, updates, calendarId);
	}

	// Webhook subscription methods

	/**
	 * Create a webhook subscription for calendar changes
	 */
	async createSubscription(
		accessToken: string,
		webhookUrl: string,
		changeTypes: Array<"created" | "updated" | "deleted"> = [
			"created",
			"updated",
			"deleted",
		],
		expirationMinutes = 4230, // Max is 4230 minutes (~3 days)
		clientState?: string,
		calendarId?: string,
	): Promise<GraphSubscription> {
		const resource = calendarId
			? `/me/calendars/${calendarId}/events`
			: "/me/calendar/events";

		const state = clientState ?? randomBytes(32).toString("hex");

		const expirationDateTime = new Date(
			Date.now() + expirationMinutes * 60 * 1000,
		).toISOString();

		const response = await fetch(`${this.graphBaseUrl}/subscriptions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				changeType: changeTypes.join(","),
				notificationUrl: webhookUrl,
				resource,
				expirationDateTime,
				clientState: state,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Outlook create subscription error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<GraphSubscription>;
	}

	/**
	 * Renew a webhook subscription
	 */
	async renewSubscription(
		accessToken: string,
		subscriptionId: string,
		expirationMinutes = 4230,
	): Promise<GraphSubscription> {
		const expirationDateTime = new Date(
			Date.now() + expirationMinutes * 60 * 1000,
		).toISOString();

		const response = await fetch(
			`${this.graphBaseUrl}/subscriptions/${subscriptionId}`,
			{
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					expirationDateTime,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Outlook renew subscription error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<GraphSubscription>;
	}

	/**
	 * Delete a webhook subscription
	 */
	async deleteSubscription(
		accessToken: string,
		subscriptionId: string,
	): Promise<void> {
		const response = await fetch(
			`${this.graphBaseUrl}/subscriptions/${subscriptionId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok && response.status !== 404) {
			const error = await response.json();
			throw new Error(
				`Outlook delete subscription error: ${JSON.stringify(error)}`,
			);
		}
	}

	/**
	 * List active subscriptions
	 */
	async listSubscriptions(accessToken: string): Promise<GraphSubscription[]> {
		const response = await fetch(`${this.graphBaseUrl}/subscriptions`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Outlook list subscriptions error: ${JSON.stringify(error)}`,
			);
		}

		const data = (await response.json()) as { value: GraphSubscription[] };
		return data.value;
	}

	/**
	 * Process webhook notification payload
	 */
	processNotification(payload: string): {
		isValidation: boolean;
		validationToken?: string;
		notifications?: Array<{
			subscriptionId: string;
			changeType: "created" | "updated" | "deleted";
			resource: string;
			resourceId?: string;
			clientState: string;
		}>;
	} {
		const data = JSON.parse(payload) as {
			value?: GraphChangeNotification[];
			validationToken?: string;
		};

		// Handle validation request
		if (data.validationToken) {
			return {
				isValidation: true,
				validationToken: data.validationToken,
			};
		}

		// Handle change notifications
		const notifications = (data.value ?? []).map((n) => ({
			subscriptionId: n.subscriptionId,
			changeType: n.changeType,
			resource: n.resource,
			resourceId: n.resourceData?.id,
			clientState: n.clientState,
		}));

		return {
			isValidation: false,
			notifications,
		};
	}

	/**
	 * Get free/busy schedule
	 */
	async getSchedule(
		accessToken: string,
		emails: string[],
		startTime: Date,
		endTime: Date,
		availabilityViewInterval = 30, // minutes
	): Promise<
		Array<{
			scheduleId: string;
			availabilityView: string;
			scheduleItems: Array<{
				status: "free" | "tentative" | "busy" | "oof" | "workingElsewhere";
				start: { dateTime: string; timeZone: string };
				end: { dateTime: string; timeZone: string };
			}>;
			workingHours?: {
				daysOfWeek: string[];
				startTime: string;
				endTime: string;
				timeZone: { name: string };
			};
		}>
	> {
		const response = await fetch(
			`${this.graphBaseUrl}/me/calendar/getSchedule`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
					Prefer: 'outlook.timezone="UTC"',
				},
				body: JSON.stringify({
					schedules: emails,
					startTime: {
						dateTime: startTime.toISOString().replace("Z", ""),
						timeZone: "UTC",
					},
					endTime: {
						dateTime: endTime.toISOString().replace("Z", ""),
						timeZone: "UTC",
					},
					availabilityViewInterval,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Outlook get schedule error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			value: Array<{
				scheduleId: string;
				availabilityView: string;
				scheduleItems: Array<{
					status: "free" | "tentative" | "busy" | "oof" | "workingElsewhere";
					start: { dateTime: string; timeZone: string };
					end: { dateTime: string; timeZone: string };
				}>;
				workingHours?: {
					daysOfWeek: string[];
					startTime: string;
					endTime: string;
					timeZone: { name: string };
				};
			}>;
		};

		return data.value;
	}

	/**
	 * Find meeting times
	 */
	async findMeetingTimes(
		accessToken: string,
		attendees: Array<{ email: string; type: "required" | "optional" }>,
		durationMinutes: number,
		timeConstraint: {
			startTime: Date;
			endTime: Date;
		},
		maxCandidates = 10,
	): Promise<
		Array<{
			meetingTimeSlot: {
				start: { dateTime: string; timeZone: string };
				end: { dateTime: string; timeZone: string };
			};
			confidence: number;
			organizerAvailability: string;
			attendeeAvailability: Array<{
				attendee: { emailAddress: { address: string } };
				availability: string;
			}>;
		}>
	> {
		const response = await fetch(`${this.graphBaseUrl}/me/findMeetingTimes`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				Prefer: 'outlook.timezone="UTC"',
			},
			body: JSON.stringify({
				attendees: attendees.map((a) => ({
					emailAddress: { address: a.email },
					type: a.type,
				})),
				timeConstraint: {
					activityDomain: "work",
					timeSlots: [
						{
							start: {
								dateTime: timeConstraint.startTime
									.toISOString()
									.replace("Z", ""),
								timeZone: "UTC",
							},
							end: {
								dateTime: timeConstraint.endTime.toISOString().replace("Z", ""),
								timeZone: "UTC",
							},
						},
					],
				},
				meetingDuration: `PT${durationMinutes}M`,
				maxCandidates,
				isOrganizerOptional: false,
				returnSuggestionReasons: true,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Outlook find meeting times error: ${JSON.stringify(error)}`,
			);
		}

		const data = (await response.json()) as {
			meetingTimeSuggestions: Array<{
				meetingTimeSlot: {
					start: { dateTime: string; timeZone: string };
					end: { dateTime: string; timeZone: string };
				};
				confidence: number;
				organizerAvailability: string;
				attendeeAvailability: Array<{
					attendee: { emailAddress: { address: string } };
					availability: string;
				}>;
			}>;
		};

		return data.meetingTimeSuggestions;
	}
}
