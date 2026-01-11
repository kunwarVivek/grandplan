// ============================================
// WEBHOOK HANDLER - Verify and route webhooks
// ============================================

import { db } from "@grandplan/db";
import { queueManager } from "@grandplan/queue";
import { integrationHub } from "./hub.js";
import type { IntegrationProvider, WebhookPayload } from "./types.js";

export class WebhookHandler {
	/**
	 * Handle incoming webhook
	 */
	async handleWebhook(
		provider: IntegrationProvider,
		payload: string,
		signature: string,
		_headers: Record<string, string>,
	): Promise<{ success: boolean; message?: string }> {
		try {
			const adapter = integrationHub.getAdapter(provider);

			// Verify webhook signature
			if (!adapter.verifyWebhook(payload, signature)) {
				return { success: false, message: "Invalid webhook signature" };
			}

			// Parse the webhook event
			const event = adapter.parseWebhookEvent(payload);

			// Log the webhook event
			await this.logWebhookEvent(provider, event);

			// Route to appropriate handler
			await this.routeWebhookEvent(provider, event);

			return { success: true };
		} catch (error) {
			console.error(`Webhook handling error for ${provider}:`, error);
			return {
				success: false,
				message: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Log webhook event to database
	 */
	private async logWebhookEvent(
		provider: IntegrationProvider,
		event: WebhookPayload,
	): Promise<void> {
		await db.integrationWebhookEvent.create({
			data: {
				integrationId: provider,
				eventType: event.eventType,
				payload: JSON.parse(JSON.stringify(event.data)),
			},
		});
	}

	/**
	 * Route webhook event to appropriate handler
	 */
	private async routeWebhookEvent(
		provider: IntegrationProvider,
		event: WebhookPayload,
	): Promise<void> {
		// Queue the webhook for processing
		await queueManager.addJob("integration:webhooks", {
			integrationId: provider,
			connectionId: "", // Will be resolved by worker
			eventType: event.eventType,
			payload: event.data,
		});
	}

	/**
	 * Process a webhook event (called by worker)
	 */
	async processWebhookEvent(
		provider: IntegrationProvider,
		eventType: string,
		data: Record<string, unknown>,
	): Promise<void> {
		switch (provider) {
			case "slack":
				await this.processSlackEvent(eventType, data);
				break;
			case "jira":
				await this.processJiraEvent(eventType, data);
				break;
			case "asana":
				await this.processAsanaEvent(eventType, data);
				break;
			case "linear":
				await this.processLinearEvent(eventType, data);
				break;
			default:
				console.log(`Unhandled webhook provider: ${provider}`);
		}
	}

	private async processSlackEvent(
		eventType: string,
		_data: Record<string, unknown>,
	): Promise<void> {
		switch (eventType) {
			case "app_mention":
				// Handle mentions
				break;
			case "message":
				// Handle messages
				break;
			case "slash_command":
				// Handle slash commands
				break;
		}
	}

	private async processJiraEvent(
		eventType: string,
		data: Record<string, unknown>,
	): Promise<void> {
		switch (eventType) {
			case "jira:issue_created":
				await this.handleExternalTaskCreated("jira", data);
				break;
			case "jira:issue_updated":
				await this.handleExternalTaskUpdated("jira", data);
				break;
			case "jira:issue_deleted":
				await this.handleExternalTaskDeleted("jira", data);
				break;
		}
	}

	private async processAsanaEvent(
		eventType: string,
		data: Record<string, unknown>,
	): Promise<void> {
		switch (eventType) {
			case "task_added":
				await this.handleExternalTaskCreated("asana", data);
				break;
			case "task_changed":
				await this.handleExternalTaskUpdated("asana", data);
				break;
			case "task_removed":
				await this.handleExternalTaskDeleted("asana", data);
				break;
		}
	}

	private async processLinearEvent(
		eventType: string,
		data: Record<string, unknown>,
	): Promise<void> {
		switch (eventType) {
			case "Issue.create":
				await this.handleExternalTaskCreated("linear", data);
				break;
			case "Issue.update":
				await this.handleExternalTaskUpdated("linear", data);
				break;
			case "Issue.remove":
				await this.handleExternalTaskDeleted("linear", data);
				break;
		}
	}

	private async handleExternalTaskCreated(
		provider: IntegrationProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		// Check if this task is linked
		const externalId = this.extractExternalId(provider, data);
		const link = await db.taskExternalLink.findFirst({
			where: { integrationId: provider, externalId },
		});

		if (!link) {
			// Queue import if sync is enabled
			await queueManager.addJob("integration:sync", {
				integrationId: provider,
				connectionId: "", // Resolve from config
				direction: "fromExternal",
				entityType: "task",
				entityIds: [externalId],
			});
		}
	}

	private async handleExternalTaskUpdated(
		provider: IntegrationProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = this.extractExternalId(provider, data);
		const link = await db.taskExternalLink.findFirst({
			where: { integrationId: provider, externalId },
		});

		if (link) {
			// Update internal task
			await queueManager.addJob("integration:sync", {
				integrationId: provider,
				connectionId: "", // Resolve from link
				direction: "fromExternal",
				entityType: "task",
				entityIds: [externalId],
			});
		}
	}

	private async handleExternalTaskDeleted(
		provider: IntegrationProvider,
		data: Record<string, unknown>,
	): Promise<void> {
		const externalId = this.extractExternalId(provider, data);

		// Remove external link
		await db.taskExternalLink.deleteMany({
			where: { integrationId: provider, externalId },
		});
	}

	private extractExternalId(
		provider: IntegrationProvider,
		data: Record<string, unknown>,
	): string {
		switch (provider) {
			case "jira":
				return ((data.issue as Record<string, unknown>)?.key as string) ?? "";
			case "asana":
				return (
					((data.resource as Record<string, unknown>)?.gid as string) ?? ""
				);
			case "linear":
				return ((data.data as Record<string, unknown>)?.id as string) ?? "";
			default:
				return (data.id as string) ?? "";
		}
	}
}

// Singleton instance
export const webhookHandler = new WebhookHandler();
