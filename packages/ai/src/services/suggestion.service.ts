// ============================================
// SUGGESTION SERVICE
// ============================================

import { db } from "@grandplan/db";
import { getAIProvider } from "../providers/provider-factory.js";
import type {
	AIDecisionType,
	AIProviderName,
	SuggestionResult,
	SuggestionType,
	TaskContext,
} from "../types.js";

export interface SuggestImprovementInput {
	taskId: string;
	type: SuggestionType;
	context?: Record<string, unknown>;
	provider?: AIProviderName;
	requestedById?: string;
}

export interface SuggestImprovementOutput {
	result: SuggestionResult;
	decisionId: string;
}

export interface QualityAssessment {
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
}

export class SuggestionService {
	/**
	 * Get a suggestion for a specific aspect of a task
	 */
	async suggestImprovement(
		input: SuggestImprovementInput,
	): Promise<SuggestImprovementOutput> {
		const { taskId, type, context, provider, requestedById } = input;

		// Fetch task with context
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			include: {
				project: {
					include: {
						workspace: true,
					},
				},
				parent: {
					select: {
						title: true,
						description: true,
					},
				},
				children: {
					select: {
						title: true,
						status: true,
					},
				},
				assignee: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		// Build task context
		const taskContext: TaskContext = {
			id: task.id,
			title: task.title,
			description: task.description,
			nodeType: task.nodeType as TaskContext["nodeType"],
			status: task.status as TaskContext["status"],
			priority: task.priority as TaskContext["priority"],
			depth: task.depth,
			estimatedHours: task.estimatedHours,
			dueDate: task.dueDate,
			parentTitle: task.parent?.title,
			parentDescription: task.parent?.description,
			childrenTitles: task.children.map((c) => c.title),
			projectName: task.project.name,
			projectDescription: task.project.description,
			workspaceContext: task.project.workspace.description ?? undefined,
		};

		// Get AI provider and generate suggestion
		const aiProvider = getAIProvider(provider);
		const startTime = Date.now();
		const result = await aiProvider.suggestImprovement(taskContext, {
			type,
			context,
		});
		const latencyMs = Date.now() - startTime;

		// Map suggestion type to decision type
		const decisionType = this.mapSuggestionTypeToDecisionType(type);

		// Store the AI decision
		const decision = await db.taskAIDecision.create({
			data: {
				taskId,
				decisionType,
				provider: aiProvider.name,
				model: provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o",
				prompt: JSON.stringify({ taskContext, type, context }),
				response: JSON.parse(JSON.stringify(result)),
				confidence: result.confidence,
				tokensUsed: 0,
				latencyMs,
				requestedById,
				applied: false,
			},
		});

		return {
			result,
			decisionId: decision.id,
		};
	}

	/**
	 * Apply a title suggestion
	 */
	async applyTitleSuggestion(
		taskId: string,
		decisionId: string,
		newTitle: string,
		userId?: string,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { title: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			db.taskNode.update({
				where: { id: taskId },
				data: { title: newTitle },
			}),

			db.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			}),

			db.taskHistory.create({
				data: {
					taskId,
					action: "UPDATED",
					field: "title",
					oldValue: task.title,
					newValue: newTitle,
					reason: "AI suggestion applied",
					actorId: userId,
					aiTriggered: true,
				},
			}),
		]);
	}

	/**
	 * Apply a description suggestion
	 */
	async applyDescriptionSuggestion(
		taskId: string,
		decisionId: string,
		newDescription: string,
		userId?: string,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { description: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			db.taskNode.update({
				where: { id: taskId },
				data: { description: newDescription },
			}),

			db.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			}),

			db.taskHistory.create({
				data: {
					taskId,
					action: "UPDATED",
					field: "description",
					oldValue: task.description ?? undefined,
					newValue: newDescription,
					reason: "AI suggestion applied",
					actorId: userId,
					aiTriggered: true,
				},
			}),
		]);
	}

	/**
	 * Apply a priority suggestion
	 */
	async applyPrioritySuggestion(
		taskId: string,
		decisionId: string,
		newPriority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
		userId?: string,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { priority: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			db.taskNode.update({
				where: { id: taskId },
				data: { priority: newPriority },
			}),

			db.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			}),

			db.taskHistory.create({
				data: {
					taskId,
					action: "PRIORITY_CHANGED",
					field: "priority",
					oldValue: task.priority,
					newValue: newPriority,
					reason: "AI suggestion applied",
					actorId: userId,
					aiTriggered: true,
				},
			}),
		]);
	}

	/**
	 * Apply a status suggestion
	 */
	async applyStatusSuggestion(
		taskId: string,
		decisionId: string,
		newStatus: string,
		userId?: string,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { status: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			db.taskNode.update({
				where: { id: taskId },
				data: {
					status: newStatus as TaskContext["status"],
					...(newStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
					...(newStatus === "IN_PROGRESS" &&
					!task.status.includes("IN_PROGRESS")
						? { startedAt: new Date() }
						: {}),
				},
			}),

			db.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			}),

			db.taskHistory.create({
				data: {
					taskId,
					action: "STATUS_CHANGED",
					field: "status",
					oldValue: task.status,
					newValue: newStatus,
					reason: "AI suggestion applied",
					actorId: userId,
					aiTriggered: true,
				},
			}),
		]);
	}

	/**
	 * Get all pending suggestions for a task
	 */
	async getPendingSuggestions(taskId: string): Promise<
		Array<{
			id: string;
			type: AIDecisionType;
			suggestion: SuggestionResult;
			confidence: number;
			createdAt: Date;
		}>
	> {
		const decisions = await db.taskAIDecision.findMany({
			where: {
				taskId,
				applied: false,
				rejectedReason: null,
				decisionType: {
					in: [
						"TITLE_SUGGEST",
						"DESCRIPTION_ENRICH",
						"PRIORITIZATION",
						"STATUS_RECOMMEND",
					],
				},
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				decisionType: true,
				response: true,
				confidence: true,
				createdAt: true,
			},
		});

		return decisions.map((d) => ({
			id: d.id,
			type: d.decisionType as AIDecisionType,
			suggestion: d.response as unknown as SuggestionResult,
			confidence: d.confidence,
			createdAt: d.createdAt,
		}));
	}

	/**
	 * Assess overall task quality and get recommendations
	 */
	async assessTaskQuality(
		taskId: string,
		_provider?: AIProviderName,
	): Promise<QualityAssessment> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			include: {
				children: { select: { id: true } },
			},
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		// Calculate scores based on task attributes
		const titleLength = task.title.length;
		const hasDescription = !!task.description && task.description.length > 50;
		const hasEstimate = task.estimatedHours !== null;
		const hasDueDate = task.dueDate !== null;
		const hasSubtasks = task.children.length > 0;

		// Simple heuristic scoring
		let clarity = 5;
		if (titleLength >= 10 && titleLength <= 80) clarity += 2;
		if (hasDescription) clarity += 2;
		if (task.title.match(/^(Add|Fix|Update|Implement|Create|Remove|Refactor)/))
			clarity += 1;

		let completeness = 5;
		if (hasDescription) completeness += 2;
		if (hasEstimate) completeness += 1.5;
		if (hasDueDate) completeness += 1.5;

		let actionability = 5;
		if (hasDescription) actionability += 2;
		if (hasEstimate) actionability += 1;
		if (task.priority !== "MEDIUM") actionability += 1; // Has explicit priority
		if (task.assigneeId) actionability += 1;

		let testability = 5;
		if (hasDescription && task.description?.includes("accept"))
			testability += 3;
		if (hasDescription && task.description?.includes("criteria"))
			testability += 2;

		let scope = 7; // Default reasonable scope
		if (hasSubtasks) scope += 1;
		if (task.nodeType === "SUBTASK") scope += 2; // Subtasks are typically well-scoped

		const overallScore =
			(clarity + completeness + actionability + testability + scope) / 5;

		// Generate recommendations
		const recommendations: QualityAssessment["recommendations"] = [];

		if (!hasDescription) {
			recommendations.push({
				type: "description",
				priority: "high",
				suggestion: "Add a detailed description with acceptance criteria",
			});
		}

		if (!hasEstimate) {
			recommendations.push({
				type: "deadline",
				priority: "medium",
				suggestion: "Add a time estimate for better planning",
			});
		}

		if (titleLength < 10) {
			recommendations.push({
				type: "title",
				priority: "medium",
				suggestion: "Make the title more descriptive",
			});
		}

		if (task.priority === "MEDIUM" && task.nodeType !== "SUBTASK") {
			recommendations.push({
				type: "priority",
				priority: "low",
				suggestion: "Consider reviewing and setting explicit priority",
			});
		}

		return {
			overallScore: Math.min(10, Math.max(0, overallScore)),
			clarity: Math.min(10, Math.max(0, clarity)),
			completeness: Math.min(10, Math.max(0, completeness)),
			actionability: Math.min(10, Math.max(0, actionability)),
			testability: Math.min(10, Math.max(0, testability)),
			scope: Math.min(10, Math.max(0, scope)),
			recommendations,
		};
	}

	/**
	 * Map suggestion type to AI decision type
	 */
	private mapSuggestionTypeToDecisionType(
		type: SuggestionType,
	): AIDecisionType {
		const mapping: Record<SuggestionType, AIDecisionType> = {
			title: "TITLE_SUGGEST",
			description: "DESCRIPTION_ENRICH",
			priority: "PRIORITIZATION",
			status: "STATUS_RECOMMEND",
			assignee: "STATUS_RECOMMEND", // No specific type, use STATUS_RECOMMEND
			deadline: "ESTIMATION", // Deadline is related to estimation
			dependencies: "DEPENDENCY_DETECT",
		};
		return mapping[type];
	}
}

// Singleton instance
export const suggestionService = new SuggestionService();
