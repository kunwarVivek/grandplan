// ============================================
// NOTIFICATION WORKER - Push/Slack notification delivery
// ============================================

import { createLogger } from "@grandplan/core";
import { db } from "@grandplan/db";
import { pushService } from "@grandplan/notifications";
import {
	type JobResult,
	type NotificationJobData,
	queueManager,
} from "@grandplan/queue";
import { WebClient, type ChatPostMessageResponse } from "@slack/web-api";
import type { Job } from "bullmq";
import {
	NotificationJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

// Create a child logger for the notification worker
const logger = createLogger({ context: { service: "notification-worker" } });

// ============================================
// Slack Client Configuration
// ============================================

/**
 * Global Slack client for bot-level notifications.
 * This is used for system-wide notifications where a single bot token is configured.
 * For user-specific Slack integrations, we'll use their stored access tokens.
 */
const globalSlackClient = process.env.SLACK_BOT_TOKEN
	? new WebClient(process.env.SLACK_BOT_TOKEN)
	: null;

if (!globalSlackClient) {
	logger.warn("SLACK_BOT_TOKEN not configured - global Slack notifications will be disabled");
}

// ============================================
// Slack Notification Types
// ============================================

interface SlackNotificationOptions {
	/** Slack channel ID or user ID (for DMs, use user's Slack ID) */
	channel: string;
	/** Main notification text (used as fallback for blocks) */
	text: string;
	/** Optional thread timestamp for replies */
	threadTs?: string;
	/** Whether to unfurl links */
	unfurlLinks?: boolean;
	/** Whether to unfurl media */
	unfurlMedia?: boolean;
}

interface SlackUserConfig {
	/** User's Slack ID for direct messages */
	slackUserId?: string;
	/** Default channel for notifications */
	defaultChannel?: string;
	/** Access token from user's Slack integration (if using user-level auth) */
	accessToken?: string;
}

// ============================================
// Slack Service Functions
// ============================================

/**
 * Get Slack configuration for a user from their integration connection
 */
async function getSlackConfigForUser(userId: string): Promise<SlackUserConfig | null> {
	try {
		// Find the Slack integration definition
		const slackIntegration = await db.integrationDefinition.findFirst({
			where: { code: "SLACK" },
		});

		if (!slackIntegration) {
			logger.debug("Slack integration definition not found");
			return null;
		}

		// Find user's Slack connection
		const connection = await db.integrationConnection.findFirst({
			where: {
				userId,
				integrationId: slackIntegration.id,
				status: "ACTIVE",
			},
		});

		if (!connection) {
			logger.debug("No active Slack connection for user", { userId });
			return null;
		}

		// Extract Slack-specific metadata
		const metadata = connection.metadata as Record<string, unknown> | null;

		return {
			slackUserId: connection.externalUserId ?? undefined,
			defaultChannel: (metadata?.defaultChannel as string) ?? undefined,
			accessToken: connection.accessToken ?? undefined,
		};
	} catch (error) {
		logger.error("Failed to get Slack config for user", error instanceof Error ? error : null, { userId });
		return null;
	}
}

/**
 * Check if user has Slack notifications enabled in their preferences
 */
async function isSlackEnabledForUser(userId: string): Promise<boolean> {
	try {
		const preference = await db.notificationPreference.findUnique({
			where: { userId },
			select: { slackEnabled: true },
		});

		return preference?.slackEnabled ?? false;
	} catch (error) {
		logger.error("Failed to check Slack preference for user", error instanceof Error ? error : null, { userId });
		return false;
	}
}

/**
 * Send a Slack notification using the appropriate client
 *
 * This function supports two modes:
 * 1. Global bot: Uses SLACK_BOT_TOKEN for system-wide notifications
 * 2. User integration: Uses user's stored access token from their Slack connection
 */
async function sendSlackNotification(
	options: SlackNotificationOptions,
	userAccessToken?: string,
): Promise<ChatPostMessageResponse | null> {
	// Determine which client to use
	const client = userAccessToken
		? new WebClient(userAccessToken)
		: globalSlackClient;

	if (!client) {
		logger.warn("No Slack client available - cannot send notification", {
			channel: options.channel,
			hasUserToken: Boolean(userAccessToken),
		});
		return null;
	}

	try {
		const response = await client.chat.postMessage({
			channel: options.channel,
			text: options.text,
			thread_ts: options.threadTs,
			unfurl_links: options.unfurlLinks ?? false,
			unfurl_media: options.unfurlMedia ?? true,
		});

		if (!response.ok) {
			logger.error("Slack API returned error", null, {
				channel: options.channel,
				error: response.error,
			});
			return null;
		}

		logger.info("Slack notification sent successfully", {
			channel: options.channel,
			messageTs: response.ts,
		});

		return response;
	} catch (error) {
		// Handle specific Slack API errors
		if (error instanceof Error) {
			const errorMessage = error.message;

			// Common Slack API errors
			if (errorMessage.includes("channel_not_found")) {
				logger.error("Slack channel not found", error, { channel: options.channel });
			} else if (errorMessage.includes("not_in_channel")) {
				logger.error("Bot is not in the Slack channel", error, { channel: options.channel });
			} else if (errorMessage.includes("invalid_auth")) {
				logger.error("Slack authentication failed - check token", error);
			} else if (errorMessage.includes("token_revoked")) {
				logger.error("Slack token has been revoked", error);
			} else if (errorMessage.includes("ratelimited")) {
				logger.warn("Slack rate limit hit - notification will be retried", { channel: options.channel });
				throw error; // Re-throw to trigger job retry
			} else {
				logger.error("Slack API error", error, { channel: options.channel });
			}
		} else {
			logger.error("Unknown Slack error", null, { channel: options.channel, error: String(error) });
		}

		return null;
	}
}

/**
 * Send a direct message to a Slack user
 * Exported for use by other modules that may need to send direct Slack messages
 */
export async function sendSlackDM(
	slackUserId: string,
	message: string,
	accessToken?: string,
): Promise<ChatPostMessageResponse | null> {
	return sendSlackNotification(
		{
			channel: slackUserId, // Slack accepts user IDs as channel for DMs
			text: message,
		},
		accessToken,
	);
}

/**
 * Format a notification for Slack
 * Creates a formatted message with context from the notification
 */
function formatNotificationForSlack(notification: {
	title: string;
	body: string | null;
	type: string;
	data?: Record<string, unknown> | null;
}): string {
	const { title, body, type, data } = notification;

	// Build the message parts
	const parts: string[] = [];

	// Add an emoji prefix based on notification type
	const emoji = getNotificationEmoji(type);
	parts.push(`${emoji} *${title}*`);

	if (body) {
		parts.push(body);
	}

	// Add action URL if available
	if (data?.actionUrl) {
		parts.push(`\n<${data.actionUrl}|View Details>`);
	}

	return parts.join("\n");
}

/**
 * Get an appropriate emoji for the notification type
 */
function getNotificationEmoji(type: string): string {
	const emojiMap: Record<string, string> = {
		// Task notifications
		TASK_ASSIGNED: ":clipboard:",
		TASK_UNASSIGNED: ":wave:",
		TASK_UPDATED: ":pencil2:",
		TASK_COMPLETED: ":white_check_mark:",
		TASK_DUE_SOON: ":alarm_clock:",
		TASK_OVERDUE: ":rotating_light:",
		TASK_BLOCKED: ":no_entry:",
		TASK_UNBLOCKED: ":green_circle:",

		// Comment/Mention
		COMMENT_ADDED: ":speech_balloon:",
		COMMENT_REPLY: ":speech_balloon:",
		MENTION: ":mega:",

		// Project/Workspace
		PROJECT_CREATED: ":file_folder:",
		PROJECT_ARCHIVED: ":file_cabinet:",
		WORKSPACE_INVITE: ":incoming_envelope:",

		// Team/Organization
		TEAM_INVITE: ":busts_in_silhouette:",
		TEAM_MEMBER_JOINED: ":wave:",
		TEAM_MEMBER_LEFT: ":door:",
		ORG_INVITE: ":office:",
		ORG_MEMBER_JOINED: ":tada:",

		// AI
		AI_DECOMPOSITION_READY: ":robot_face:",
		AI_SUGGESTION_AVAILABLE: ":bulb:",

		// Integration
		INTEGRATION_CONNECTED: ":electric_plug:",
		INTEGRATION_DISCONNECTED: ":x:",
		INTEGRATION_SYNC_COMPLETE: ":arrows_counterclockwise:",
		INTEGRATION_SYNC_FAILED: ":warning:",

		// Billing
		SUBSCRIPTION_CREATED: ":credit_card:",
		SUBSCRIPTION_RENEWED: ":repeat:",
		SUBSCRIPTION_CANCELLED: ":no_entry_sign:",
		PAYMENT_FAILED: ":x:",
		TRIAL_ENDING: ":hourglass:",

		// System
		SYSTEM_ANNOUNCEMENT: ":loudspeaker:",
		SYSTEM_MAINTENANCE: ":wrench:",
	};

	return emojiMap[type] ?? ":bell:";
}

/**
 * Process Slack notification delivery for a notification
 */
async function processSlackNotification(notification: {
	id: string;
	userId: string;
	title: string;
	body: string | null;
	type: string;
	data: Record<string, unknown> | null;
}): Promise<boolean> {
	const { id, userId, title, body, type, data } = notification;

	// Check if user has Slack enabled
	const slackEnabled = await isSlackEnabledForUser(userId);
	if (!slackEnabled) {
		logger.debug("Slack notifications disabled for user", { userId, notificationId: id });
		return true; // Not an error, just skipped
	}

	// Get user's Slack configuration
	const slackConfig = await getSlackConfigForUser(userId);

	if (!slackConfig) {
		logger.debug("No Slack configuration for user", { userId, notificationId: id });
		return true; // Not an error, just skipped
	}

	// Determine the channel/recipient
	const channel = slackConfig.slackUserId ?? slackConfig.defaultChannel;

	if (!channel) {
		logger.warn("No Slack channel or user ID configured", { userId, notificationId: id });
		return false;
	}

	// Format the message
	const message = formatNotificationForSlack({ title, body, type, data });

	// Send the notification
	const result = await sendSlackNotification(
		{ channel, text: message },
		slackConfig.accessToken,
	);

	if (result) {
		// Update notification to mark Slack as sent
		await db.notification.update({
			where: { id },
			data: { slackSentAt: new Date() },
		});
		return true;
	}

	return false;
}

// ============================================
// Worker Registration
// ============================================

export function registerNotificationWorker(): void {
	queueManager.registerWorker<NotificationJobData, JobResult>(
		"notifications",
		async (job: Job<NotificationJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				NotificationJobSchema,
				job.data,
				job.id,
				"notifications"
			);

			const { notificationId, channels } = validatedData;

			logger.info("Processing notification job", {
				jobId: job.id,
				notificationId,
				channels,
			});

			try {
				// Get notification from database
				const notification = await db.notification.findUnique({
					where: { id: notificationId },
				});

				if (!notification) {
					logger.warn("Notification not found", { notificationId });
					return { success: false, error: "Notification not found" };
				}

				// Track delivery results
				const results: Record<string, boolean> = {};
				const errors: string[] = [];

				// Process each channel
				const notificationData = notification.data as Record<string, unknown> | null;

				for (const channel of channels) {
					try {
						switch (channel) {
							case "push":
								await pushService.send({
									userId: notification.userId,
									title: notification.title,
									body: notification.body ?? "",
									url: (notificationData?.actionUrl as string | undefined) ?? undefined,
									data: notificationData ?? undefined,
								});
								results.push = true;
								logger.debug("Push notification sent", { notificationId, userId: notification.userId });
								break;

							case "slack":
								const slackSuccess = await processSlackNotification({
									id: notification.id,
									userId: notification.userId,
									title: notification.title,
									body: notification.body,
									type: notification.type,
									data: notificationData,
								});
								results.slack = slackSuccess;
								if (!slackSuccess) {
									errors.push("Slack delivery failed");
								}
								break;

							default:
								logger.warn("Unknown notification channel", { channel, notificationId });
								results[channel] = false;
								errors.push(`Unknown channel: ${channel}`);
						}
					} catch (channelError) {
						logger.error(
							`Failed to deliver to channel ${channel}`,
							channelError instanceof Error ? channelError : null,
							{ notificationId, channel },
						);
						results[channel] = false;
						errors.push(`${channel}: ${channelError instanceof Error ? channelError.message : "Unknown error"}`);
					}
				}

				// Determine overall success
				const successCount = Object.values(results).filter(Boolean).length;
				const totalChannels = channels.length;

				if (successCount === 0 && totalChannels > 0) {
					return {
						success: false,
						error: `All deliveries failed: ${errors.join("; ")}`,
					};
				}

				return {
					success: true,
					message: `Notification delivered to ${successCount}/${totalChannels} channels`,
				};
			} catch (error) {
				logger.error("Notification delivery failed", error instanceof Error ? error : null, {
					notificationId,
					jobId: job.id,
				});
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 10,
		},
	);

	logger.info("Notification worker registered");
}
