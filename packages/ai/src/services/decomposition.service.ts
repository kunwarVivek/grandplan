// ============================================
// TASK DECOMPOSITION SERVICE
// ============================================

import { db } from "@grandplan/db";
import { getAIProvider } from "../providers/provider-factory.js";
import type {
	AIProviderName,
	DecompositionOptions,
	DecompositionResult,
	SubtaskSuggestion,
	TaskContext,
} from "../types.js";

export interface DecomposeTaskInput {
	taskId: string;
	options?: DecompositionOptions;
	provider?: AIProviderName;
	requestedById?: string;
}

export interface DecomposeTaskOutput {
	result: DecompositionResult;
	decisionId: string;
	createdSubtasks?: Array<{
		id: string;
		title: string;
	}>;
}

export class DecompositionService {
	/**
	 * Decompose a task into subtasks using AI
	 */
	async decomposeTask(input: DecomposeTaskInput): Promise<DecomposeTaskOutput> {
		const { taskId, options = {}, provider, requestedById } = input;

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
					},
				},
			},
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		// Fetch siblings
		const siblings = task.parentId
			? await db.taskNode.findMany({
					where: {
						parentId: task.parentId,
						id: { not: taskId },
					},
					select: { title: true },
					take: 10,
				})
			: [];

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
			siblingTitles: siblings.map((s) => s.title),
			childrenTitles: task.children.map((c) => c.title),
			projectName: task.project.name,
			projectDescription: task.project.description,
			workspaceContext: task.project.workspace.description ?? undefined,
		};

		// Get AI provider and decompose
		const aiProvider = getAIProvider(provider);
		const startTime = Date.now();
		const result = await aiProvider.decomposeTask(taskContext, options);
		const latencyMs = Date.now() - startTime;

		// Store the AI decision
		const decision = await db.taskAIDecision.create({
			data: {
				taskId,
				decisionType: "DECOMPOSITION",
				provider: aiProvider.name,
				model: provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o",
				prompt: JSON.stringify({ taskContext, options }),
				response: JSON.parse(JSON.stringify(result)),
				reasoning: result.reasoning,
				confidence: result.confidence,
				tokensUsed: 0, // Would need to track from response
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
	 * Apply decomposition result by creating subtasks
	 */
	async applyDecomposition(
		taskId: string,
		decisionId: string,
		subtasks: SubtaskSuggestion[],
		createdById: string,
	): Promise<Array<{ id: string; title: string }>> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { id: true, path: true, depth: true, projectId: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		// Create subtasks in a transaction
		const createdSubtasks = await db.$transaction(async (tx) => {
			const results: Array<{ id: string; title: string }> = [];

			for (const subtask of subtasks) {
				const newTask = await tx.taskNode.create({
					data: {
						title: subtask.title,
						description: subtask.description,
						nodeType: subtask.nodeType,
						priority: subtask.priority,
						status: "PENDING",
						position: subtask.order,
						estimatedHours: subtask.estimatedHours,
						aiGenerated: true,
						aiConfidence: 0.8, // From decomposition confidence
						depth: task.depth + 1,
						path: `${task.path}.${Date.now()}`, // Simplified path generation
						projectId: task.projectId,
						parentId: task.id,
						createdById,
					},
				});

				results.push({ id: newTask.id, title: newTask.title });

				// Create history entry
				await tx.taskHistory.create({
					data: {
						taskId: newTask.id,
						action: "CREATED",
						reason: "AI decomposition",
						aiTriggered: true,
					},
				});
			}

			// Mark the decision as applied
			await tx.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			});

			// Create history entry for parent task
			await tx.taskHistory.create({
				data: {
					taskId,
					action: "DECOMPOSED",
					newValue: { subtaskCount: subtasks.length },
					reason: "AI decomposition applied",
					aiTriggered: true,
				},
			});

			return results;
		});

		return createdSubtasks;
	}

	/**
	 * Reject a decomposition decision
	 */
	async rejectDecomposition(decisionId: string, reason: string): Promise<void> {
		await db.taskAIDecision.update({
			where: { id: decisionId },
			data: {
				applied: false,
				rejectedReason: reason,
			},
		});
	}

	/**
	 * Get decomposition history for a task
	 */
	async getDecompositionHistory(taskId: string): Promise<
		Array<{
			id: string;
			createdAt: Date;
			confidence: number;
			applied: boolean;
			subtaskCount: number;
		}>
	> {
		const decisions = await db.taskAIDecision.findMany({
			where: {
				taskId,
				decisionType: "DECOMPOSITION",
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				createdAt: true,
				confidence: true,
				applied: true,
				response: true,
			},
		});

		return decisions.map((d) => ({
			id: d.id,
			createdAt: d.createdAt,
			confidence: d.confidence,
			applied: d.applied,
			subtaskCount:
				(d.response as { subtasks?: unknown[] })?.subtasks?.length ?? 0,
		}));
	}

	/**
	 * Re-decompose with feedback
	 */
	async redecomposeWithFeedback(
		taskId: string,
		decisionId: string,
		_feedback: string,
		requestedById?: string,
	): Promise<DecomposeTaskOutput> {
		// Get the original decision
		const originalDecision = await db.taskAIDecision.findUnique({
			where: { id: decisionId },
			select: { response: true },
		});

		if (!originalDecision) {
			throw new Error(`Decision not found: ${decisionId}`);
		}

		// Decompose again with the feedback context
		// In a full implementation, we would pass the feedback to the prompt
		return this.decomposeTask({
			taskId,
			options: { preserveExisting: true },
			requestedById,
		});
	}
}

// Singleton instance
export const decompositionService = new DecompositionService();
