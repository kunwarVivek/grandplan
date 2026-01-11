// ============================================
// AI JOB SERVICE - Queue-based AI operations
// ============================================

import {
	type AIProviderName,
	decompositionService,
	estimationService,
} from "@grandplan/ai";
import { db } from "@grandplan/db";
import { notificationService } from "@grandplan/notifications";
import {
	type AIDecompositionJobData,
	type AISuggestionJobData,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";

export interface QueueDecomposeRequest {
	taskId: string;
	workspaceId: string;
	maxSubtasks?: number;
	depth?: number;
	provider?: AIProviderName;
	userId: string;
	organizationId: string;
}

export interface QueueEstimateRequest {
	taskId: string;
	provider?: AIProviderName;
	userId: string;
	organizationId: string;
}

export interface QueueSuggestionRequest {
	taskId: string;
	suggestionType: "status" | "priority" | "assignee" | "deadline";
	provider?: AIProviderName;
	userId: string;
	organizationId: string;
}

export class AIJobService {
	/**
	 * Queue a decomposition job for background processing
	 */
	async queueDecomposition(request: QueueDecomposeRequest): Promise<string> {
		const jobData: AIDecompositionJobData = {
			taskId: request.taskId,
			workspaceId: request.workspaceId,
			depth: request.depth,
			maxSubtasks: request.maxSubtasks,
			userId: request.userId,
			organizationId: request.organizationId,
		};

		const job = await queueManager.addJob("ai:decomposition", jobData, {
			jobId: `decompose-${request.taskId}-${Date.now()}`,
		});

		return job.id ?? "unknown";
	}

	/**
	 * Queue an estimation job for background processing
	 */
	async queueEstimation(request: QueueEstimateRequest): Promise<string> {
		const job = await queueManager.addJob(
			"ai:suggestions",
			{
				taskId: request.taskId,
				suggestionType: "deadline" as const,
				userId: request.userId,
				organizationId: request.organizationId,
			} satisfies AISuggestionJobData,
			{
				jobId: `estimate-${request.taskId}-${Date.now()}`,
			},
		);

		return job.id ?? "unknown";
	}

	/**
	 * Queue a suggestion job for background processing
	 */
	async queueSuggestion(request: QueueSuggestionRequest): Promise<string> {
		const jobData: AISuggestionJobData = {
			taskId: request.taskId,
			suggestionType: request.suggestionType,
			userId: request.userId,
			organizationId: request.organizationId,
		};

		const job = await queueManager.addJob("ai:suggestions", jobData, {
			jobId: `suggest-${request.taskId}-${request.suggestionType}-${Date.now()}`,
		});

		return job.id ?? "unknown";
	}

	/**
	 * Register AI job workers
	 */
	registerWorkers(): void {
		// Decomposition worker
		queueManager.registerWorker<AIDecompositionJobData>(
			"ai:decomposition",
			async (job: Job<AIDecompositionJobData>) => {
				try {
					const result = await this.processDecompositionJob(job.data);
					return { success: true, data: result };
				} catch (error) {
					console.error("Decomposition job failed:", error);
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
			{ concurrency: 3 },
		);

		// Suggestion worker
		queueManager.registerWorker<AISuggestionJobData>(
			"ai:suggestions",
			async (job: Job<AISuggestionJobData>) => {
				try {
					const result = await this.processSuggestionJob(job.data);
					return { success: true, data: result };
				} catch (error) {
					console.error("Suggestion job failed:", error);
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			},
			{ concurrency: 5 },
		);
	}

	/**
	 * Process a decomposition job
	 */
	private async processDecompositionJob(
		data: AIDecompositionJobData,
	): Promise<{ decisionId: string; subtaskCount: number }> {
		const { taskId, maxSubtasks, userId } = data;

		// Perform decomposition
		const output = await decompositionService.decomposeTask({
			taskId,
			options: {
				maxSubtasks: maxSubtasks ?? 8,
				includeEstimates: true,
			},
			requestedById: userId,
		});

		// Notify user that decomposition is ready
		if (userId) {
			const task = await db.taskNode.findUnique({
				where: { id: taskId },
				select: { title: true },
			});

			await notificationService.send({
				type: "AI_DECOMPOSITION_READY",
				userId,
				title: "Task Decomposition Ready",
				body: `AI has generated ${output.result.subtasks.length} subtasks for "${task?.title}"`,
				resourceType: "task",
				resourceId: taskId,
				actionUrl: `/tasks/${taskId}`,
				data: {
					decisionId: output.decisionId,
					subtaskCount: output.result.subtasks.length,
					confidence: output.result.confidence,
				},
			});
		}

		return {
			decisionId: output.decisionId,
			subtaskCount: output.result.subtasks.length,
		};
	}

	/**
	 * Process a suggestion job
	 */
	private async processSuggestionJob(
		data: AISuggestionJobData,
	): Promise<{ decisionId: string }> {
		const { taskId, suggestionType, userId } = data;

		// For estimation requests
		if (suggestionType === "deadline") {
			const output = await estimationService.estimateTask({
				taskId,
				options: { includeBreakdown: true },
				requestedById: userId,
			});

			// Notify user
			if (userId) {
				const task = await db.taskNode.findUnique({
					where: { id: taskId },
					select: { title: true },
				});

				await notificationService.send({
					type: "AI_SUGGESTION_AVAILABLE",
					userId,
					title: "Task Estimation Ready",
					body: `AI estimated "${task?.title}" at ${output.result.estimatedHours} hours`,
					resourceType: "task",
					resourceId: taskId,
					actionUrl: `/tasks/${taskId}`,
					data: {
						decisionId: output.decisionId,
						estimatedHours: output.result.estimatedHours,
						confidence: output.result.confidence,
					},
				});
			}

			return { decisionId: output.decisionId };
		}

		// For other suggestion types, we would call suggestionService
		// This is a simplified version
		return { decisionId: "pending" };
	}

	/**
	 * Get job status
	 */
	async getJobStatus(
		queueName: "ai:decomposition" | "ai:suggestions",
		jobId: string,
	): Promise<{
		status: "waiting" | "active" | "completed" | "failed" | "unknown";
		progress?: number;
		result?: unknown;
		error?: string;
	}> {
		const queue = queueManager.getQueue(queueName);
		const job = await queue.getJob(jobId);

		if (!job) {
			return { status: "unknown" };
		}

		const state = await job.getState();
		const progress = job.progress;

		if (state === "completed") {
			return {
				status: "completed",
				progress: 100,
				result: job.returnvalue,
			};
		}

		if (state === "failed") {
			return {
				status: "failed",
				error: job.failedReason,
			};
		}

		return {
			status: state as "waiting" | "active",
			progress: typeof progress === "number" ? progress : 0,
		};
	}

	/**
	 * Cancel a pending job
	 */
	async cancelJob(
		queueName: "ai:decomposition" | "ai:suggestions",
		jobId: string,
	): Promise<boolean> {
		const queue = queueManager.getQueue(queueName);
		const job = await queue.getJob(jobId);

		if (!job) {
			return false;
		}

		const state = await job.getState();
		if (state === "waiting" || state === "delayed") {
			await job.remove();
			return true;
		}

		return false;
	}

	/**
	 * Get queue statistics
	 */
	async getQueueStats(): Promise<{
		decomposition: {
			waiting: number;
			active: number;
			completed: number;
			failed: number;
		};
		suggestions: {
			waiting: number;
			active: number;
			completed: number;
			failed: number;
		};
	}> {
		const [decompositionCounts, suggestionCounts] = await Promise.all([
			queueManager.getJobCounts("ai:decomposition"),
			queueManager.getJobCounts("ai:suggestions"),
		]);

		return {
			decomposition: decompositionCounts,
			suggestions: suggestionCounts,
		};
	}
}

// Singleton instance
export const aiJobService = new AIJobService();
