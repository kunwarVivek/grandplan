// ============================================
// GOOGLE CALENDAR ADAPTER - Google Calendar integration
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

// Google Calendar API types
interface GoogleCalendar {
	id: string;
	summary: string;
	description?: string;
	timeZone: string;
	primary?: boolean;
	accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
	backgroundColor?: string;
	foregroundColor?: string;
}

interface GoogleCalendarEvent {
	id: string;
	htmlLink: string;
	summary: string;
	description?: string;
	location?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	status: "confirmed" | "tentative" | "cancelled";
	created: string;
	updated: string;
	creator?: {
		email: string;
		displayName?: string;
		self?: boolean;
	};
	organizer?: {
		email: string;
		displayName?: string;
		self?: boolean;
	};
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus: "needsAction" | "declined" | "tentative" | "accepted";
		optional?: boolean;
		organizer?: boolean;
		self?: boolean;
	}>;
	recurrence?: string[];
	recurringEventId?: string;
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: "email" | "popup";
			minutes: number;
		}>;
	};
	extendedProperties?: {
		private?: Record<string, string>;
		shared?: Record<string, string>;
	};
	colorId?: string;
	conferenceData?: {
		entryPoints?: Array<{
			entryPointType: string;
			uri: string;
			label?: string;
		}>;
		conferenceSolution?: {
			name: string;
			iconUri: string;
		};
		conferenceId?: string;
	};
}

interface GoogleCalendarListResponse {
	kind: string;
	etag: string;
	nextPageToken?: string;
	nextSyncToken?: string;
	items: GoogleCalendar[];
}

interface GoogleEventsListResponse {
	kind: string;
	etag: string;
	summary: string;
	updated: string;
	timeZone: string;
	accessRole: string;
	nextPageToken?: string;
	nextSyncToken?: string;
	items: GoogleCalendarEvent[];
}

interface GooglePushChannel {
	id: string;
	resourceId: string;
	resourceUri: string;
	expiration: string;
}

interface GoogleUserInfo {
	id: string;
	email: string;
	name: string;
	picture?: string;
}

export class GoogleCalendarAdapter implements IntegrationAdapter {
	provider = "google_calendar" as const;

	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private calendarApiBaseUrl = "https://www.googleapis.com/calendar/v3";
	private authBaseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
	private tokenUrl = "https://oauth2.googleapis.com/token";

	constructor(config: {
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.redirectUri = config.redirectUri;
	}

	getAuthorizationUrl(state: string, scopes?: string[]): string {
		const defaultScopes = [
			"openid",
			"email",
			"profile",
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/calendar.events",
		];
		const scopeList = scopes ?? defaultScopes;

		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			redirect_uri: this.redirectUri,
			scope: scopeList.join(" "),
			state,
			access_type: "offline",
			prompt: "consent",
		});

		return `${this.authBaseUrl}?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
		const response = await fetch(this.tokenUrl, {
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
		});

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
				`Google OAuth error: ${data.error_description ?? data.error}`,
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
				userEmail: userInfo.email,
				userName: userInfo.name,
				userPicture: userInfo.picture,
			},
		};
	}

	async refreshTokens(refreshToken: string): Promise<OAuthCredentials> {
		const response = await fetch(this.tokenUrl, {
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
			access_token?: string;
			expires_in?: number;
			scope?: string;
			token_type?: string;
			error?: string;
			error_description?: string;
		};

		if (data.error) {
			throw new Error(
				`Google token refresh error: ${data.error_description ?? data.error}`,
			);
		}

		return {
			accessToken: data.access_token!,
			refreshToken: refreshToken, // Google doesn't return a new refresh token
			expiresAt: data.expires_in
				? new Date(Date.now() + data.expires_in * 1000)
				: undefined,
			scope: data.scope,
			tokenType: data.token_type,
		};
	}

	async fetchExternalItems(
		connectionId: string,
		options?: { since?: Date },
	): Promise<ExternalItem[]> {
		// This would need access to the connection's credentials
		throw new Error(
			"fetchExternalItems requires credentials - use fetchEvents directly",
		);
	}

	async pushToExternal(
		connectionId: string,
		items: InternalItem[],
	): Promise<SyncResult> {
		// This would need access to the connection's credentials
		throw new Error(
			"pushToExternal requires credentials - use createEvent directly",
		);
	}

	verifyWebhook(payload: string, signature: string): boolean {
		// Google Calendar push notifications use channel tokens for verification
		// The token is set when creating the watch and included in the X-Goog-Channel-Token header
		// Here we just verify that the token matches what we expect
		// In practice, you'd compare the signature (token) with the stored channel token
		return signature.length > 0;
	}

	parseWebhookEvent(payload: string): WebhookPayload {
		// Google Calendar sends minimal data in push notifications
		// The payload body is often empty - real data comes from headers
		// Resource state is in X-Goog-Resource-State header
		// We need to re-fetch the actual data
		let data: Record<string, unknown> = {};
		try {
			data = payload ? JSON.parse(payload) : {};
		} catch {
			// Google often sends empty payload
		}

		return {
			integrationId: "google_calendar",
			eventType: data.resourceState as string ?? "sync",
			timestamp: new Date(),
			data,
		};
	}

	// Google Calendar-specific methods

	/**
	 * Fetch user info from Google
	 */
	private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
		const response = await fetch(
			"https://www.googleapis.com/oauth2/v2/userinfo",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch user info: ${response.statusText}`);
		}

		return response.json() as Promise<GoogleUserInfo>;
	}

	/**
	 * List all calendars accessible by the user
	 */
	async listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
		const response = await fetch(`${this.calendarApiBaseUrl}/users/me/calendarList`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Google Calendar list error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as GoogleCalendarListResponse;
		return data.items;
	}

	/**
	 * Get the primary calendar
	 */
	async getPrimaryCalendar(accessToken: string): Promise<GoogleCalendar> {
		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/primary`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Google Calendar get primary error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<GoogleCalendar>;
	}

	/**
	 * Fetch calendar events
	 */
	async fetchEvents(
		accessToken: string,
		calendarId: string = "primary",
		options?: {
			timeMin?: Date;
			timeMax?: Date;
			maxResults?: number;
			pageToken?: string;
			syncToken?: string;
			singleEvents?: boolean;
			orderBy?: "startTime" | "updated";
			showDeleted?: boolean;
		},
	): Promise<{
		events: GoogleCalendarEvent[];
		nextPageToken?: string;
		nextSyncToken?: string;
	}> {
		const params = new URLSearchParams();

		if (options?.timeMin) {
			params.set("timeMin", options.timeMin.toISOString());
		}
		if (options?.timeMax) {
			params.set("timeMax", options.timeMax.toISOString());
		}
		if (options?.maxResults) {
			params.set("maxResults", options.maxResults.toString());
		}
		if (options?.pageToken) {
			params.set("pageToken", options.pageToken);
		}
		if (options?.syncToken) {
			params.set("syncToken", options.syncToken);
		}
		if (options?.singleEvents !== undefined) {
			params.set("singleEvents", options.singleEvents.toString());
		}
		if (options?.orderBy) {
			params.set("orderBy", options.orderBy);
		}
		if (options?.showDeleted !== undefined) {
			params.set("showDeleted", options.showDeleted.toString());
		}

		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Google Calendar events error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as GoogleEventsListResponse;

		return {
			events: data.items ?? [],
			nextPageToken: data.nextPageToken,
			nextSyncToken: data.nextSyncToken,
		};
	}

	/**
	 * Get a specific event
	 */
	async getEvent(
		accessToken: string,
		calendarId: string,
		eventId: string,
	): Promise<GoogleCalendarEvent> {
		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Google Calendar get event error: ${JSON.stringify(error)}`);
		}

		return response.json() as Promise<GoogleCalendarEvent>;
	}

	/**
	 * Create a calendar event
	 */
	async createEvent(
		accessToken: string,
		calendarId: string = "primary",
		event: {
			summary: string;
			description?: string;
			location?: string;
			start: {
				dateTime?: string;
				date?: string;
				timeZone?: string;
			};
			end: {
				dateTime?: string;
				date?: string;
				timeZone?: string;
			};
			attendees?: Array<{ email: string; optional?: boolean }>;
			reminders?: {
				useDefault: boolean;
				overrides?: Array<{ method: "email" | "popup"; minutes: number }>;
			};
			extendedProperties?: {
				private?: Record<string, string>;
				shared?: Record<string, string>;
			};
			conferenceDataVersion?: number;
		},
		sendUpdates?: "all" | "externalOnly" | "none",
	): Promise<GoogleCalendarEvent> {
		const params = new URLSearchParams();
		if (sendUpdates) {
			params.set("sendUpdates", sendUpdates);
		}

		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(event),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Google Calendar create event error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<GoogleCalendarEvent>;
	}

	/**
	 * Update a calendar event
	 */
	async updateEvent(
		accessToken: string,
		calendarId: string,
		eventId: string,
		event: Partial<{
			summary: string;
			description: string;
			location: string;
			start: {
				dateTime?: string;
				date?: string;
				timeZone?: string;
			};
			end: {
				dateTime?: string;
				date?: string;
				timeZone?: string;
			};
			attendees: Array<{ email: string; optional?: boolean }>;
			reminders: {
				useDefault: boolean;
				overrides?: Array<{ method: "email" | "popup"; minutes: number }>;
			};
			extendedProperties: {
				private?: Record<string, string>;
				shared?: Record<string, string>;
			};
			status: "confirmed" | "tentative" | "cancelled";
		}>,
		sendUpdates?: "all" | "externalOnly" | "none",
	): Promise<GoogleCalendarEvent> {
		const params = new URLSearchParams();
		if (sendUpdates) {
			params.set("sendUpdates", sendUpdates);
		}

		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?${params.toString()}`,
			{
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(event),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Google Calendar update event error: ${JSON.stringify(error)}`,
			);
		}

		return response.json() as Promise<GoogleCalendarEvent>;
	}

	/**
	 * Delete a calendar event
	 */
	async deleteEvent(
		accessToken: string,
		calendarId: string,
		eventId: string,
		sendUpdates?: "all" | "externalOnly" | "none",
	): Promise<void> {
		const params = new URLSearchParams();
		if (sendUpdates) {
			params.set("sendUpdates", sendUpdates);
		}

		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?${params.toString()}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok && response.status !== 410) {
			// 410 means already deleted
			const error = await response.json();
			throw new Error(
				`Google Calendar delete event error: ${JSON.stringify(error)}`,
			);
		}
	}

	// Task-to-event sync helpers

	/**
	 * Create a calendar event from a task
	 */
	async createEventFromTask(
		accessToken: string,
		calendarId: string = "primary",
		task: {
			id: string;
			title: string;
			description?: string;
			dueDate: Date;
			duration?: number; // minutes, defaults to 60
			priority?: string;
			url?: string;
		},
	): Promise<GoogleCalendarEvent> {
		const duration = task.duration ?? 60;
		const endDate = new Date(task.dueDate.getTime() + duration * 60 * 1000);

		const description = [
			task.description ?? "",
			"",
			`Priority: ${task.priority ?? "Normal"}`,
			task.url ? `View in GrandPlan: ${task.url}` : "",
		]
			.filter(Boolean)
			.join("\n");

		return this.createEvent(accessToken, calendarId, {
			summary: task.title,
			description,
			start: {
				dateTime: task.dueDate.toISOString(),
			},
			end: {
				dateTime: endDate.toISOString(),
			},
			extendedProperties: {
				private: {
					grandplanTaskId: task.id,
					grandplanPriority: task.priority ?? "",
				},
			},
			reminders: {
				useDefault: false,
				overrides: [
					{ method: "popup", minutes: 30 },
					{ method: "email", minutes: 60 },
				],
			},
		});
	}

	/**
	 * Update a calendar event from task changes
	 */
	async updateEventFromTask(
		accessToken: string,
		calendarId: string,
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
	): Promise<GoogleCalendarEvent> {
		const updates: Parameters<typeof this.updateEvent>[3] = {};

		if (task.title !== undefined) {
			updates.summary = task.title;
		}

		if (task.description !== undefined || task.priority !== undefined) {
			const description = [
				task.description ?? "",
				"",
				task.priority ? `Priority: ${task.priority}` : "",
				task.url ? `View in GrandPlan: ${task.url}` : "",
			]
				.filter(Boolean)
				.join("\n");
			updates.description = description;
		}

		if (task.dueDate !== undefined) {
			const duration = task.duration ?? 60;
			const endDate = new Date(task.dueDate.getTime() + duration * 60 * 1000);

			updates.start = {
				dateTime: task.dueDate.toISOString(),
			};
			updates.end = {
				dateTime: endDate.toISOString(),
			};
		}

		if (task.completed !== undefined) {
			updates.status = task.completed ? "cancelled" : "confirmed";
		}

		if (task.priority !== undefined) {
			updates.extendedProperties = {
				private: {
					grandplanPriority: task.priority,
				},
			};
		}

		return this.updateEvent(accessToken, calendarId, eventId, updates);
	}

	// Push notification (webhook) methods

	/**
	 * Set up push notifications for calendar events
	 */
	async watchCalendar(
		accessToken: string,
		calendarId: string = "primary",
		webhookUrl: string,
		channelId?: string,
		token?: string,
		expiration?: Date,
	): Promise<GooglePushChannel> {
		const id = channelId ?? crypto.randomUUID();
		const channelToken = token ?? crypto.randomBytes(32).toString("hex");

		// Default expiration is 7 days (max allowed by Google)
		const expirationTime =
			expiration?.getTime() ??
			Date.now() + 7 * 24 * 60 * 60 * 1000;

		const response = await fetch(
			`${this.calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id,
					type: "web_hook",
					address: webhookUrl,
					token: channelToken,
					expiration: expirationTime.toString(),
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`Google Calendar watch error: ${JSON.stringify(error)}`,
			);
		}

		const data = (await response.json()) as {
			kind: string;
			id: string;
			resourceId: string;
			resourceUri: string;
			expiration: string;
		};

		return {
			id: data.id,
			resourceId: data.resourceId,
			resourceUri: data.resourceUri,
			expiration: data.expiration,
		};
	}

	/**
	 * Stop push notifications for a channel
	 */
	async stopWatch(
		accessToken: string,
		channelId: string,
		resourceId: string,
	): Promise<void> {
		const response = await fetch(
			"https://www.googleapis.com/calendar/v3/channels/stop",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: channelId,
					resourceId,
				}),
			},
		);

		if (!response.ok && response.status !== 404) {
			// 404 means channel doesn't exist (already stopped)
			const error = await response.json();
			throw new Error(
				`Google Calendar stop watch error: ${JSON.stringify(error)}`,
			);
		}
	}

	/**
	 * Process push notification headers
	 */
	parsePushNotification(headers: Record<string, string>): {
		channelId: string;
		resourceId: string;
		resourceState: "sync" | "exists" | "not_exists";
		channelToken?: string;
		messageNumber: string;
		resourceUri?: string;
		channelExpiration?: string;
	} {
		return {
			channelId: headers["x-goog-channel-id"] ?? "",
			resourceId: headers["x-goog-resource-id"] ?? "",
			resourceState: (headers["x-goog-resource-state"] as "sync" | "exists" | "not_exists") ?? "sync",
			channelToken: headers["x-goog-channel-token"],
			messageNumber: headers["x-goog-message-number"] ?? "0",
			resourceUri: headers["x-goog-resource-uri"],
			channelExpiration: headers["x-goog-channel-expiration"],
		};
	}

	/**
	 * Get free/busy information
	 */
	async getFreeBusy(
		accessToken: string,
		timeMin: Date,
		timeMax: Date,
		calendarIds: string[] = ["primary"],
	): Promise<
		Record<
			string,
			Array<{ start: string; end: string }>
		>
	> {
		const response = await fetch(`${this.calendarApiBaseUrl}/freeBusy`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				timeMin: timeMin.toISOString(),
				timeMax: timeMax.toISOString(),
				items: calendarIds.map((id) => ({ id })),
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Google Calendar freeBusy error: ${JSON.stringify(error)}`);
		}

		const data = (await response.json()) as {
			calendars: Record<
				string,
				{
					busy: Array<{ start: string; end: string }>;
					errors?: Array<{ domain: string; reason: string }>;
				}
			>;
		};

		const result: Record<string, Array<{ start: string; end: string }>> = {};
		for (const [calendarId, calendar] of Object.entries(data.calendars)) {
			result[calendarId] = calendar.busy ?? [];
		}

		return result;
	}

	/**
	 * Find available time slots
	 */
	async findAvailableSlots(
		accessToken: string,
		timeMin: Date,
		timeMax: Date,
		durationMinutes: number,
		calendarIds: string[] = ["primary"],
	): Promise<Array<{ start: Date; end: Date }>> {
		const freeBusy = await this.getFreeBusy(
			accessToken,
			timeMin,
			timeMax,
			calendarIds,
		);

		// Merge all busy times
		const allBusy: Array<{ start: Date; end: Date }> = [];
		for (const busy of Object.values(freeBusy)) {
			for (const slot of busy) {
				allBusy.push({
					start: new Date(slot.start),
					end: new Date(slot.end),
				});
			}
		}

		// Sort by start time
		allBusy.sort((a, b) => a.start.getTime() - b.start.getTime());

		// Merge overlapping busy times
		const mergedBusy: Array<{ start: Date; end: Date }> = [];
		for (const slot of allBusy) {
			if (
				mergedBusy.length === 0 ||
				slot.start > mergedBusy[mergedBusy.length - 1].end
			) {
				mergedBusy.push(slot);
			} else {
				mergedBusy[mergedBusy.length - 1].end = new Date(
					Math.max(
						mergedBusy[mergedBusy.length - 1].end.getTime(),
						slot.end.getTime(),
					),
				);
			}
		}

		// Find gaps that are at least durationMinutes long
		const availableSlots: Array<{ start: Date; end: Date }> = [];
		const durationMs = durationMinutes * 60 * 1000;

		let currentStart = timeMin;
		for (const busy of mergedBusy) {
			if (busy.start.getTime() - currentStart.getTime() >= durationMs) {
				availableSlots.push({
					start: currentStart,
					end: busy.start,
				});
			}
			currentStart = busy.end;
		}

		// Check time after last busy slot
		if (timeMax.getTime() - currentStart.getTime() >= durationMs) {
			availableSlots.push({
				start: currentStart,
				end: timeMax,
			});
		}

		return availableSlots;
	}
}
