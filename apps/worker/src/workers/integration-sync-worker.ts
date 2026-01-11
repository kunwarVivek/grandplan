// ============================================
// INTEGRATION SYNC WORKER - Two-way sync with external services
// ============================================

import { db } from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { integrationHub, type IntegrationProvider } from "@grandplan/integrations";
import {
	type IntegrationSyncJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";

export function registerIntegrationSyncWorker(): void {
	queueManager.registerWorker<IntegrationSyncJobData, JobResult>(
		"integration:sync",
		async (job: Job<IntegrationSyncJobData>): Promise<JobResult> => {
			const { integrationId, connectionId, direction, entityType, entityIds } =
				job.data;

			console.log(
				`Processing ${direction} sync for ${integrationId} (connection: ${connectionId})`,
			);

			try {
				// Get connection
				const connection = await db.integrationConnection.findUnique({
					where: { id: connectionId },
				});

				if (!connection) {
					return { success: false, error: "Connection not found" };
				}

				if (connection.status !== "ACTIVE") {
					return {
						success: false,
						error: `Connection is ${connection.status}`,
					};
				}

				const adapter = integrationHub.getAdapter(integrationId as IntegrationProvider);
				let syncedCount = 0;
				let failedCount = 0;
				const errors: Array<{ itemId: string; error: string }> = [];

				if (direction === "fromExternal" || direction === "bidirectional") {
					// Fetch from external service
					const externalItems = await adapter.fetchExternalItems(connectionId, {
						since: job.data.correlationId
							? undefined
							: new Date(Date.now() - 24 * 60 * 60 * 1000),
					});

					for (const item of externalItems) {
						try {
							await processExternalItem(connection.userId, integrationId, item);
							syncedCount++;
						} catch (error) {
							failedCount++;
							errors.push({
								itemId: item.externalId,
								error: error instanceof Error ? error.message : "Unknown error",
							});
						}
					}
				}

				if (direction === "toExternal" || direction === "bidirectional") {
					// Get internal items to sync
					const internalItems = await getInternalItemsToSync(
						connection.userId,
						entityType,
						entityIds,
					);

					const result = await adapter.pushToExternal(
						connectionId,
						internalItems as Array<{ id: string; type: "task" | "project" | "comment"; data: Record<string, unknown> }>,
					);
					syncedCount += result.syncedCount;
					failedCount += result.failedCount;
					if (result.errors) {
						errors.push(...result.errors);
					}
				}

				// Emit sync completed event - direction must be "toExternal" or "fromExternal" for event payload
				const eventDirection = direction === "bidirectional" ? "toExternal" : direction;
				await eventBus.emit("integration.syncCompleted", {
					integrationId: connectionId,
					userId: connection.userId,
					direction: eventDirection,
					itemsSynced: syncedCount,
					errors: errors.length > 0 ? errors.map((e) => e.error) : undefined,
				});

				return {
					success: failedCount === 0,
					message: `Synced ${syncedCount} items, ${failedCount} failed`,
					data: { syncedCount, failedCount, errors },
				};
			} catch (error) {
				console.error("Integration sync failed:", error);

				await eventBus.emit("integration.syncFailed", {
					integrationId: connectionId,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 3,
		},
	);

	console.log("Integration sync worker registered");
}

async function processExternalItem(
	_userId: string,
	integrationId: string,
	item: { externalId: string; type: string; data: Record<string, unknown> },
): Promise<void> {
	// Check if already linked
	const existingLink = await db.taskExternalLink.findFirst({
		where: {
			integrationId,
			externalId: item.externalId,
		},
	});

	if (existingLink) {
		// Update existing task
		await db.taskNode.update({
			where: { id: existingLink.taskId },
			data: mapExternalDataToTask(item.data),
		});

		await db.taskExternalLink.update({
			where: { id: existingLink.id },
			data: {
				lastSyncedAt: new Date(),
				syncStatus: "SYNCED",
			},
		});
	} else {
		// Create new task (would need project context)
		console.log(`New external item from ${integrationId}: ${item.externalId}`);
	}
}

async function getInternalItemsToSync(
	userId: string,
	entityType: string,
	entityIds?: string[],
): Promise<Array<{ id: string; type: string; data: Record<string, unknown> }>> {
	if (entityType !== "task") {
		return [];
	}

	const tasks = await db.taskNode.findMany({
		where: {
			createdById: userId,
			...(entityIds && { id: { in: entityIds } }),
		},
		take: 100,
	});

	return tasks.map((task) => ({
		id: task.id,
		type: "task",
		data: {
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
		},
	}));
}

function mapExternalDataToTask(
	data: Record<string, unknown>,
): Record<string, unknown> {
	return {
		title: data.title ?? data.name ?? data.summary,
		description: data.description ?? data.body,
		// Additional field mappings based on integration
	};
}
