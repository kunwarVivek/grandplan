// ============================================
// AI ORCHESTRATOR SERVICE
// ============================================

import {
	type AIProviderName,
	type DecompositionResult,
	decompositionService,
	type EstimationResult,
	estimationService,
	getAIFactory,
	type SuggestionResult,
	type SuggestionType,
	suggestionService,
} from "@grandplan/ai";
import { ForbiddenError, NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";
import { queueManager as _queueManager } from "@grandplan/queue";

export interface AIOperationContext {
	userId: string;
	organizationId: string;
	workspaceId?: string;
}

export interface DecomposeTaskRequest {
	taskId: string;
	maxSubtasks?: number;
	includeEstimates?: boolean;
	autoApply?: boolean;
	provider?: AIProviderName;
}

export interface EstimateTaskRequest {
	taskId: string;
	includeBreakdown?: boolean;
	autoApply?: boolean;
	provider?: AIProviderName;
}

export interface SuggestRequest {
	taskId: string;
	type: SuggestionType;
	provider?: AIProviderName;
}

export class AIOrchestrator {
	/**
	 * Initialize the AI factory with environment configuration
	 */
	async initialize(config: {
		openaiApiKey?: string;
		anthropicApiKey?: string;
		defaultProvider?: AIProviderName;
	}): Promise<void> {
		const factory = getAIFactory();

		factory.initialize({
			openai: config.openaiApiKey
				? { apiKey: config.openaiApiKey, model: "gpt-4o" }
				: undefined,
			anthropic: config.anthropicApiKey
				? { apiKey: config.anthropicApiKey, model: "claude-sonnet-4-20250514" }
				: undefined,
			defaultProvider: config.defaultProvider ?? "openai",
		});
	}

	/**
	 * Decompose a task into subtasks
	 */
	async decomposeTask(
		request: DecomposeTaskRequest,
		context: AIOperationContext,
	): Promise<{
		result: DecompositionResult;
		decisionId: string;
		createdSubtasks?: Array<{ id: string; title: string }>;
	}> {
		// Verify access to the task
		await this.verifyTaskAccess(request.taskId, context);

		// Check usage limits
		await this.checkUsageLimits(context.organizationId, "decomposition");

		// Perform decomposition
		const output = await decompositionService.decomposeTask({
			taskId: request.taskId,
			options: {
				maxSubtasks: request.maxSubtasks ?? 8,
				includeEstimates: request.includeEstimates ?? true,
			},
			provider: request.provider,
			requestedById: context.userId,
		});

		// Track usage
		await this.trackAIUsage(context.organizationId, "decomposition");

		// Auto-apply if requested and confidence is high enough
		if (request.autoApply && output.result.confidence >= 0.7) {
			const createdSubtasks = await decompositionService.applyDecomposition(
				request.taskId,
				output.decisionId,
				output.result.subtasks,
				context.userId,
			);

			return {
				...output,
				createdSubtasks,
			};
		}

		return output;
	}

	/**
	 * Estimate a task
	 */
	async estimateTask(
		request: EstimateTaskRequest,
		context: AIOperationContext,
	): Promise<{
		result: EstimationResult;
		decisionId: string;
	}> {
		// Verify access to the task
		await this.verifyTaskAccess(request.taskId, context);

		// Check usage limits
		await this.checkUsageLimits(context.organizationId, "estimation");

		// Perform estimation
		const output = await estimationService.estimateTask({
			taskId: request.taskId,
			options: {
				includeBreakdown: request.includeBreakdown ?? true,
				considerDependencies: true,
			},
			provider: request.provider,
			requestedById: context.userId,
		});

		// Track usage
		await this.trackAIUsage(context.organizationId, "estimation");

		// Auto-apply if requested and confidence is high enough
		if (request.autoApply && output.result.confidence >= 0.75) {
			await estimationService.applyEstimation(
				request.taskId,
				output.decisionId,
				output.result.estimatedHours,
			);
		}

		return output;
	}

	/**
	 * Get suggestions for a task
	 */
	async suggestImprovement(
		request: SuggestRequest,
		context: AIOperationContext,
	): Promise<{
		result: SuggestionResult;
		decisionId: string;
	}> {
		// Verify access to the task
		await this.verifyTaskAccess(request.taskId, context);

		// Check usage limits
		await this.checkUsageLimits(context.organizationId, "suggestion");

		// Generate suggestion
		const output = await suggestionService.suggestImprovement({
			taskId: request.taskId,
			type: request.type,
			provider: request.provider,
			requestedById: context.userId,
		});

		// Track usage
		await this.trackAIUsage(context.organizationId, "suggestion");

		return output;
	}

	/**
	 * Apply a pending AI decision
	 */
	async applyDecision(
		decisionId: string,
		context: AIOperationContext,
	): Promise<void> {
		const decision = await db.taskAIDecision.findUnique({
			where: { id: decisionId },
			include: {
				task: {
					include: {
						project: {
							include: {
								workspace: true,
							},
						},
					},
				},
			},
		});

		if (!decision) {
			throw new NotFoundError("AI decision", decisionId);
		}

		// Verify access
		if (
			decision.task.project.workspace.organizationId !== context.organizationId
		) {
			throw new ForbiddenError("Access denied to this decision");
		}

		if (decision.applied) {
			throw new Error("Decision has already been applied");
		}

		// Apply based on decision type
		const response = decision.response as Record<string, unknown>;

		switch (decision.decisionType) {
			case "DECOMPOSITION": {
				const decompositionResult = response as unknown as DecompositionResult;
				await decompositionService.applyDecomposition(
					decision.taskId,
					decisionId,
					decompositionResult.subtasks,
					context.userId,
				);
				break;
			}

			case "ESTIMATION": {
				const estimationResult = response as unknown as EstimationResult;
				await estimationService.applyEstimation(
					decision.taskId,
					decisionId,
					estimationResult.estimatedHours,
				);
				break;
			}

			case "TITLE_SUGGEST": {
				const titleSuggestion = response as {
					suggestion: { suggested: string };
				};
				await suggestionService.applyTitleSuggestion(
					decision.taskId,
					decisionId,
					titleSuggestion.suggestion.suggested,
					context.userId,
				);
				break;
			}

			case "DESCRIPTION_ENRICH": {
				const descSuggestion = response as {
					suggestion: { suggested: string };
				};
				await suggestionService.applyDescriptionSuggestion(
					decision.taskId,
					decisionId,
					descSuggestion.suggestion.suggested,
					context.userId,
				);
				break;
			}

			case "PRIORITIZATION": {
				const prioritySuggestion = response as {
					suggestion: { suggested: string };
				};
				await suggestionService.applyPrioritySuggestion(
					decision.taskId,
					decisionId,
					prioritySuggestion.suggestion.suggested as
						| "CRITICAL"
						| "HIGH"
						| "MEDIUM"
						| "LOW",
					context.userId,
				);
				break;
			}

			case "STATUS_RECOMMEND": {
				const statusSuggestion = response as {
					suggestion: { suggested: string };
				};
				await suggestionService.applyStatusSuggestion(
					decision.taskId,
					decisionId,
					statusSuggestion.suggestion.suggested,
					context.userId,
				);
				break;
			}

			default:
				throw new Error(`Unsupported decision type: ${decision.decisionType}`);
		}
	}

	/**
	 * Reject a pending AI decision
	 */
	async rejectDecision(
		decisionId: string,
		reason: string,
		context: AIOperationContext,
	): Promise<void> {
		const decision = await db.taskAIDecision.findUnique({
			where: { id: decisionId },
			include: {
				task: {
					include: {
						project: {
							include: {
								workspace: true,
							},
						},
					},
				},
			},
		});

		if (!decision) {
			throw new NotFoundError("AI decision", decisionId);
		}

		// Verify access
		if (
			decision.task.project.workspace.organizationId !== context.organizationId
		) {
			throw new ForbiddenError("Access denied to this decision");
		}

		await db.taskAIDecision.update({
			where: { id: decisionId },
			data: {
				applied: false,
				rejectedReason: reason,
			},
		});
	}

	/**
	 * Get AI decision history for a task
	 */
	async getDecisionHistory(
		taskId: string,
		context: AIOperationContext,
	): Promise<
		Array<{
			id: string;
			decisionType: string;
			provider: string;
			confidence: number;
			applied: boolean;
			rejectedReason: string | null;
			createdAt: Date;
			appliedAt: Date | null;
		}>
	> {
		// Verify access
		await this.verifyTaskAccess(taskId, context);

		const decisions = await db.taskAIDecision.findMany({
			where: { taskId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				decisionType: true,
				provider: true,
				confidence: true,
				applied: true,
				rejectedReason: true,
				createdAt: true,
				appliedAt: true,
			},
		});

		return decisions;
	}

	/**
	 * Get task quality assessment
	 */
	async assessTaskQuality(
		taskId: string,
		context: AIOperationContext,
	): Promise<{
		overallScore: number;
		clarity: number;
		completeness: number;
		actionability: number;
		testability: number;
		scope: number;
		recommendations: Array<{
			type: SuggestionType;
			priority: "high" | "medium" | "low";
			suggestion: string;
		}>;
	}> {
		// Verify access
		await this.verifyTaskAccess(taskId, context);

		return suggestionService.assessTaskQuality(taskId);
	}

	/**
	 * Verify the user has access to the task
	 */
	private async verifyTaskAccess(
		taskId: string,
		context: AIOperationContext,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			include: {
				project: {
					include: {
						workspace: true,
					},
				},
			},
		});

		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		// Verify organization membership
		if (task.project.workspace.organizationId !== context.organizationId) {
			throw new ForbiddenError("Access denied to this task");
		}

		// Could add workspace-level checks here if needed
	}

	/**
	 * Check if the organization has remaining AI usage
	 */
	private async checkUsageLimits(
		organizationId: string,
		_operationType: "decomposition" | "estimation" | "suggestion",
	): Promise<void> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
			include: { plan: true },
		});

		if (!subscription) {
			// No subscription - allow limited usage or throw error
			return;
		}

		const maxRequests =
			subscription.plan.maxAIRequestsPerMonth ?? Number.POSITIVE_INFINITY;
		const currentUsage = subscription.usedAIRequests;

		if (currentUsage >= maxRequests) {
			throw new ForbiddenError(
				`AI usage limit reached (${maxRequests} requests/month). Please upgrade your plan.`,
			);
		}
	}

	/**
	 * Track AI usage for billing
	 */
	private async trackAIUsage(
		organizationId: string,
		operationType: "decomposition" | "estimation" | "suggestion",
	): Promise<void> {
		const subscription = await db.subscription.findUnique({
			where: { organizationId },
		});

		if (subscription) {
			await db.subscription.update({
				where: { id: subscription.id },
				data: {
					usedAIRequests: { increment: 1 },
				},
			});

			// Also record detailed usage
			await db.usageRecord.create({
				data: {
					subscriptionId: subscription.id,
					metric: `ai_${operationType}`,
					quantity: 1,
					periodStart: subscription.currentPeriodStart,
					periodEnd: subscription.currentPeriodEnd,
					metadata: { operationType },
				},
			});
		}
	}
}

// Singleton instance
export const aiOrchestrator = new AIOrchestrator();
