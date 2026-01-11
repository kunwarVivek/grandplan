// ============================================
// INTEGRATION SYNC WORKER - Two-way sync with external services
// ============================================

import { db, Prisma } from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import {
	integrationHub,
	type IntegrationProvider,
	JiraAdapter,
	LinearAdapter,
	AsanaAdapter,
} from "@grandplan/integrations";
import {
	type IntegrationSyncJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import {
	IntegrationSyncJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

// Status mapping: internal to external systems
const STATUS_TO_EXTERNAL: Record<string, Record<string, string>> = {
	jira: {
		DRAFT: "To Do",
		PENDING: "To Do",
		IN_PROGRESS: "In Progress",
		BLOCKED: "In Progress",
		IN_REVIEW: "In Review",
		COMPLETED: "Done",
		CANCELLED: "Cancelled",
	},
	linear: {
		DRAFT: "backlog",
		PENDING: "unstarted",
		IN_PROGRESS: "started",
		BLOCKED: "started",
		IN_REVIEW: "started",
		COMPLETED: "completed",
		CANCELLED: "cancelled",
	},
	asana: {
		DRAFT: "Not Started",
		PENDING: "Not Started",
		IN_PROGRESS: "In Progress",
		BLOCKED: "In Progress",
		IN_REVIEW: "In Progress",
		COMPLETED: "Completed",
		CANCELLED: "Cancelled",
	},
};

// Priority mapping: internal to external systems
const PRIORITY_TO_EXTERNAL: Record<string, Record<string, string | number>> = {
	jira: {
		CRITICAL: "Highest",
		HIGH: "High",
		MEDIUM: "Medium",
		LOW: "Low",
	},
	linear: {
		CRITICAL: 1, // Urgent
		HIGH: 2,
		MEDIUM: 3,
		LOW: 4,
	},
	asana: {
		CRITICAL: "high",
		HIGH: "high",
		MEDIUM: "medium",
		LOW: "low",
	},
};

// Maximum retry attempts for external API calls
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Type for Jira issue types from the adapter
interface JiraIssueType {
	id: string;
	name: string;
	description?: string;
	subtask: boolean;
	iconUrl?: string;
}

export function registerIntegrationSyncWorker(): void {
	queueManager.registerWorker<IntegrationSyncJobData, JobResult>(
		"integration:sync",
		async (job: Job<IntegrationSyncJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				IntegrationSyncJobSchema,
				job.data,
				job.id,
				"integration:sync"
			);

			const { integrationId, connectionId, direction, entityType, entityIds } =
				validatedData;

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

					// Create external items using the appropriate adapter
					const result = await createExternalItems(
						connection,
						integrationId as IntegrationProvider,
						internalItems,
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

/**
 * Helper to delay for retries
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	delayMs: number = RETRY_DELAY_MS,
): Promise<T> {
	let lastError: Error | undefined;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.warn(
				`Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}`,
			);
			if (attempt < maxRetries - 1) {
				await delay(delayMs * Math.pow(2, attempt)); // Exponential backoff
			}
		}
	}
	throw lastError;
}

/**
 * Interface for connection with credentials
 */
interface ConnectionWithCredentials {
	id: string;
	userId: string;
	integrationId: string;
	accessToken: string | null;
	refreshToken: string | null;
	tokenExpiresAt: Date | null;
	externalTeamId: string | null;
	metadata: Prisma.JsonValue;
}

/**
 * Create external items in the target integration system
 */
async function createExternalItems(
	connection: ConnectionWithCredentials,
	integrationId: IntegrationProvider,
	items: Array<{ id: string; type: string; data: Record<string, unknown> }>,
): Promise<{
	syncedCount: number;
	failedCount: number;
	errors?: Array<{ itemId: string; error: string }>;
}> {
	let syncedCount = 0;
	let failedCount = 0;
	const errors: Array<{ itemId: string; error: string }> = [];

	if (!connection.accessToken) {
		return {
			syncedCount: 0,
			failedCount: items.length,
			errors: items.map((item) => ({
				itemId: item.id,
				error: "No access token available for connection",
			})),
		};
	}

	for (const item of items) {
		try {
			// Check if this item already has an external link
			const existingLink = await db.taskExternalLink.findFirst({
				where: {
					taskId: item.id,
					integration: {
						code: integrationId.toUpperCase() as Prisma.EnumIntegrationTypeFilter["equals"],
					},
				},
			});

			if (existingLink) {
				// Update existing external item
				await updateExternalItem(
					connection,
					integrationId,
					existingLink.externalId,
					item,
				);

				// Update the sync status
				await db.taskExternalLink.update({
					where: { id: existingLink.id },
					data: {
						lastSyncedAt: new Date(),
						lastSyncDirection: "TO_EXTERNAL",
						syncStatus: "SYNCED",
						lastSyncError: null,
						localVersion: { increment: 1 },
					},
				});
			} else {
				// Create new external item
				const externalResult = await createExternalItem(
					connection,
					integrationId,
					item,
				);

				if (externalResult) {
					// Get the integration definition ID
					const integrationDef = await db.integrationDefinition.findFirst({
						where: {
							code: integrationId.toUpperCase() as Prisma.EnumIntegrationTypeFilter["equals"],
						},
					});

					if (integrationDef) {
						// Store the mapping between internal and external IDs
						await db.taskExternalLink.create({
							data: {
								taskId: item.id,
								integrationId: integrationDef.id,
								externalId: externalResult.externalId,
								externalUrl: externalResult.externalUrl,
								lastSyncedAt: new Date(),
								lastSyncDirection: "TO_EXTERNAL",
								syncStatus: "SYNCED",
								localVersion: 1,
								externalVersion: externalResult.externalVersion,
								metadata: externalResult.metadata
									? (externalResult.metadata as Prisma.InputJsonValue)
									: Prisma.JsonNull,
							},
						});
					}
				}
			}

			syncedCount++;
		} catch (error) {
			failedCount++;
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			errors.push({ itemId: item.id, error: errorMessage });

			// Update the task external link with error status if it exists
			const existingLink = await db.taskExternalLink.findFirst({
				where: {
					taskId: item.id,
					integration: {
						code: integrationId.toUpperCase() as Prisma.EnumIntegrationTypeFilter["equals"],
					},
				},
			});

			if (existingLink) {
				await db.taskExternalLink.update({
					where: { id: existingLink.id },
					data: {
						syncStatus: "ERROR",
						lastSyncError: errorMessage,
					},
				});
			}

			console.error(
				`Failed to sync item ${item.id} to ${integrationId}:`,
				errorMessage,
			);
		}
	}

	return { syncedCount, failedCount, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Create a single external item in the target system
 */
async function createExternalItem(
	connection: ConnectionWithCredentials,
	integrationId: IntegrationProvider,
	item: { id: string; type: string; data: Record<string, unknown> },
): Promise<{
	externalId: string;
	externalUrl?: string;
	externalVersion?: string;
	metadata?: Record<string, unknown>;
} | null> {
	const accessToken = connection.accessToken!;
	const metadata = connection.metadata as Record<string, unknown> | null;

	switch (integrationId) {
		case "jira": {
			return await withRetry(async () => {
				const adapter = integrationHub.getAdapter("jira") as JiraAdapter;
				const cloudId = metadata?.primaryCloudId as string;
				const projectKey = metadata?.defaultProjectKey as string;

				if (!cloudId) {
					throw new Error("Jira cloud ID not found in connection metadata");
				}
				if (!projectKey) {
					throw new Error("Jira project key not found in connection metadata");
				}

				// Get issue types for the project
				const issueTypes = (await adapter.getIssueTypes(
					accessToken,
					cloudId,
					projectKey,
				)) as JiraIssueType[];
				const taskIssueType = issueTypes.find(
					(t: JiraIssueType) => t.name.toLowerCase() === "task" || !t.subtask,
				);

				if (!taskIssueType) {
					throw new Error("No suitable issue type found in Jira project");
				}

				const jiraPriority = mapPriorityToExternal(
					integrationId,
					item.data.priority as string,
				);

				const issue = await adapter.createIssue(accessToken, cloudId, {
					projectKey,
					summary: item.data.title as string,
					description: item.data.description as string | undefined,
					issueTypeId: taskIssueType.id,
					priority: jiraPriority as string,
					dueDate: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});

				return {
					externalId: issue.id,
					externalUrl: `https://${metadata?.primarySiteName}.atlassian.net/browse/${issue.key}`,
					externalVersion: issue.fields.updated,
					metadata: {
						jiraKey: issue.key,
						jiraProjectKey: projectKey,
						jiraIssueTypeId: taskIssueType.id,
					},
				};
			});
		}

		case "linear": {
			return await withRetry(async () => {
				const adapter = integrationHub.getAdapter("linear") as LinearAdapter;
				const teamId = (metadata?.primaryTeamId as string) || connection.externalTeamId;

				if (!teamId) {
					throw new Error("Linear team ID not found in connection metadata");
				}

				const linearPriority = mapPriorityToExternal(
					integrationId,
					item.data.priority as string,
				);

				// Find a workflow state for the current status
				const targetState = mapStatusToExternal(
					integrationId,
					item.data.status as string,
				);
				const state = await adapter.findStateByInternalStatus(
					accessToken,
					teamId,
					targetState,
				);

				const issue = await adapter.createIssue(accessToken, {
					teamId,
					title: item.data.title as string,
					description: item.data.description as string | undefined,
					priority: linearPriority as number,
					stateId: state?.id,
					dueDate: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});

				return {
					externalId: issue.id,
					externalUrl: issue.url,
					metadata: {
						linearIdentifier: issue.identifier,
						linearTeamId: teamId,
						linearStateId: state?.id,
					},
				};
			});
		}

		case "asana": {
			return await withRetry(async () => {
				const adapter = integrationHub.getAdapter("asana") as AsanaAdapter;
				const projectId = metadata?.defaultProjectId as string;

				if (!projectId) {
					throw new Error("Asana project ID not found in connection metadata");
				}

				const task = await adapter.createTask(accessToken, {
					projectId,
					name: item.data.title as string,
					notes: item.data.description as string | undefined,
					dueOn: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});

				return {
					externalId: task.gid,
					externalUrl: `https://app.asana.com/0/${projectId}/${task.gid}`,
					metadata: {
						asanaProjectId: projectId,
					},
				};
			});
		}

		default:
			console.warn(`External item creation not implemented for ${integrationId}`);
			return null;
	}
}

/**
 * Update an existing external item in the target system
 */
async function updateExternalItem(
	connection: ConnectionWithCredentials,
	integrationId: IntegrationProvider,
	externalId: string,
	item: { id: string; type: string; data: Record<string, unknown> },
): Promise<void> {
	const accessToken = connection.accessToken!;
	const metadata = connection.metadata as Record<string, unknown> | null;

	switch (integrationId) {
		case "jira": {
			await withRetry(async () => {
				const adapter = integrationHub.getAdapter("jira") as JiraAdapter;
				const cloudId = metadata?.primaryCloudId as string;

				if (!cloudId) {
					throw new Error("Jira cloud ID not found in connection metadata");
				}

				// Get the issue key from the external ID or lookup
				const issue = await adapter.getIssue(accessToken, cloudId, externalId);
				const jiraPriority = mapPriorityToExternal(
					integrationId,
					item.data.priority as string,
				);

				await adapter.updateIssue(accessToken, cloudId, issue.key, {
					summary: item.data.title as string,
					description: item.data.description as string | undefined,
					priority: jiraPriority as string,
					dueDate: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});
			});
			break;
		}

		case "linear": {
			await withRetry(async () => {
				const adapter = integrationHub.getAdapter("linear") as LinearAdapter;
				const teamId = (metadata?.primaryTeamId as string) || connection.externalTeamId;

				if (!teamId) {
					throw new Error("Linear team ID not found in connection metadata");
				}

				const linearPriority = mapPriorityToExternal(
					integrationId,
					item.data.priority as string,
				);

				// Find a workflow state for the current status
				const targetState = mapStatusToExternal(
					integrationId,
					item.data.status as string,
				);
				const state = await adapter.findStateByInternalStatus(
					accessToken,
					teamId,
					targetState,
				);

				await adapter.updateIssue(accessToken, externalId, {
					title: item.data.title as string,
					description: item.data.description as string | undefined,
					priority: linearPriority as number,
					stateId: state?.id,
					dueDate: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});
			});
			break;
		}

		case "asana": {
			await withRetry(async () => {
				const adapter = integrationHub.getAdapter("asana") as AsanaAdapter;

				await adapter.updateTask(accessToken, externalId, {
					name: item.data.title as string,
					notes: item.data.description as string | undefined,
					dueOn: item.data.dueDate
						? new Date(item.data.dueDate as string).toISOString().split("T")[0]
						: undefined,
				});
			});
			break;
		}

		default:
			console.warn(`External item update not implemented for ${integrationId}`);
	}
}

/**
 * Map internal status to external system status
 */
function mapStatusToExternal(integrationId: string, status: string): string {
	const mapping = STATUS_TO_EXTERNAL[integrationId];
	if (!mapping) {
		return status;
	}
	return mapping[status] ?? status;
}

/**
 * Map internal priority to external system priority
 */
function mapPriorityToExternal(
	integrationId: string,
	priority: string,
): string | number {
	const mapping = PRIORITY_TO_EXTERNAL[integrationId];
	if (!mapping) {
		return priority;
	}
	return mapping[priority] ?? priority;
}
