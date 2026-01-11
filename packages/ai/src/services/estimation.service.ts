// ============================================
// TASK ESTIMATION SERVICE
// ============================================

import { db } from "@grandplan/db";
import { getAIProvider } from "../providers/provider-factory.js";
import type {
	AIProviderName,
	EstimationOptions,
	EstimationResult,
	TaskContext,
} from "../types.js";

export interface EstimateTaskInput {
	taskId: string;
	options?: EstimationOptions;
	provider?: AIProviderName;
	requestedById?: string;
}

export interface EstimateTaskOutput {
	result: EstimationResult;
	decisionId: string;
}

export interface BatchEstimateInput {
	taskIds: string[];
	options?: EstimationOptions;
	provider?: AIProviderName;
	requestedById?: string;
}

export interface BatchEstimateOutput {
	estimates: Map<string, EstimationResult>;
	totalHours: number;
	averageConfidence: number;
}

export class EstimationService {
	/**
	 * Estimate a single task using AI
	 */
	async estimateTask(input: EstimateTaskInput): Promise<EstimateTaskOutput> {
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
						estimatedHours: true,
					},
				},
				children: {
					select: {
						title: true,
						estimatedHours: true,
						status: true,
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

		// Check for historical calibration data
		const calibrationOptions = await this.getCalibrationData(task.projectId);

		// Get AI provider and estimate
		const aiProvider = getAIProvider(provider);
		const startTime = Date.now();
		const result = await aiProvider.estimateTask(taskContext, {
			...options,
			...calibrationOptions,
		});
		const latencyMs = Date.now() - startTime;

		// Store the AI decision
		const decision = await db.taskAIDecision.create({
			data: {
				taskId,
				decisionType: "ESTIMATION",
				provider: aiProvider.name,
				model: provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o",
				prompt: JSON.stringify({ taskContext, options }),
				response: JSON.parse(JSON.stringify(result)),
				reasoning: result.reasoning,
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
	 * Apply an estimation to a task
	 */
	async applyEstimation(
		taskId: string,
		decisionId: string,
		estimatedHours: number,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { estimatedHours: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			// Update task estimate
			db.taskNode.update({
				where: { id: taskId },
				data: { estimatedHours },
			}),

			// Mark decision as applied
			db.taskAIDecision.update({
				where: { id: decisionId },
				data: {
					applied: true,
					appliedAt: new Date(),
				},
			}),

			// Create history entry
			db.taskHistory.create({
				data: {
					taskId,
					action: "ESTIMATE_UPDATED",
					field: "estimatedHours",
					oldValue: task.estimatedHours ?? undefined,
					newValue: estimatedHours,
					reason: "AI estimation applied",
					aiTriggered: true,
				},
			}),
		]);
	}

	/**
	 * Estimate multiple tasks in batch
	 */
	async estimateBatch(input: BatchEstimateInput): Promise<BatchEstimateOutput> {
		const { taskIds, options = {}, provider, requestedById } = input;

		const estimates = new Map<string, EstimationResult>();
		let totalHours = 0;
		let totalConfidence = 0;

		// Process in parallel with concurrency limit
		const concurrencyLimit = 3;
		for (let i = 0; i < taskIds.length; i += concurrencyLimit) {
			const batch = taskIds.slice(i, i + concurrencyLimit);

			const results = await Promise.all(
				batch.map((taskId) =>
					this.estimateTask({ taskId, options, provider, requestedById })
						.then((output) => ({ taskId, output }))
						.catch((error) => ({ taskId, error })),
				),
			);

			for (const result of results) {
				if ("output" in result) {
					estimates.set(result.taskId, result.output.result);
					totalHours += result.output.result.estimatedHours;
					totalConfidence += result.output.result.confidence;
				}
			}
		}

		return {
			estimates,
			totalHours,
			averageConfidence:
				estimates.size > 0 ? totalConfidence / estimates.size : 0,
		};
	}

	/**
	 * Get roll-up estimation for a parent task based on children
	 */
	async getRollupEstimation(taskId: string): Promise<{
		childrenTotal: number;
		currentEstimate: number | null;
		variance: number | null;
		recommendation: string;
	}> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			include: {
				children: {
					select: {
						estimatedHours: true,
						status: true,
					},
				},
			},
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		const childrenTotal = task.children.reduce(
			(sum, child) => sum + (child.estimatedHours ?? 0),
			0,
		);

		const currentEstimate = task.estimatedHours;
		const variance =
			currentEstimate !== null
				? ((childrenTotal - currentEstimate) / currentEstimate) * 100
				: null;

		let recommendation: string;
		if (childrenTotal === 0) {
			recommendation = "No child estimates available";
		} else if (variance === null) {
			recommendation = `Consider setting estimate to ${childrenTotal} hours based on subtasks`;
		} else if (Math.abs(variance) <= 10) {
			recommendation = "Estimate aligns well with subtask estimates";
		} else if (variance > 0) {
			recommendation = `Subtask estimates exceed parent by ${variance.toFixed(1)}%. Consider updating parent estimate to ${childrenTotal} hours`;
		} else {
			recommendation = `Parent estimate exceeds subtasks by ${Math.abs(variance).toFixed(1)}%. Subtasks may be missing or underestimated`;
		}

		return {
			childrenTotal,
			currentEstimate,
			variance,
			recommendation,
		};
	}

	/**
	 * Get calibration data from historical estimates
	 */
	private async getCalibrationData(
		projectId: string,
	): Promise<{ teamVelocity?: number }> {
		// Get completed tasks with estimates from the last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const completedTasks = await db.taskNode.findMany({
			where: {
				projectId,
				status: "COMPLETED",
				estimatedHours: { not: null },
				actualHours: { not: null },
				completedAt: { gte: thirtyDaysAgo },
			},
			select: {
				estimatedHours: true,
				actualHours: true,
			},
		});

		if (completedTasks.length < 5) {
			// Not enough data for calibration
			return {};
		}

		// Calculate average velocity (actual/estimated ratio)
		const velocities = completedTasks.map(
			(t) => (t.actualHours ?? 0) / (t.estimatedHours ?? 1),
		);
		void velocities.reduce((a, b) => a + b, 0);

		// Convert to story points equivalent (rough approximation)
		const avgHoursPerPoint = 4; // Typical 4 hours per story point
		const totalActualHours = completedTasks.reduce(
			(sum, t) => sum + (t.actualHours ?? 0),
			0,
		);
		const teamVelocity = Math.round(totalActualHours / avgHoursPerPoint / 2); // Per sprint (2 weeks)

		return {
			teamVelocity: teamVelocity > 0 ? teamVelocity : undefined,
		};
	}

	/**
	 * Record actual hours for calibration
	 */
	async recordActualHours(
		taskId: string,
		actualHours: number,
		completedById?: string,
	): Promise<void> {
		const task = await db.taskNode.findUnique({
			where: { id: taskId },
			select: { estimatedHours: true, actualHours: true },
		});

		if (!task) {
			throw new Error(`Task not found: ${taskId}`);
		}

		await db.$transaction([
			db.taskNode.update({
				where: { id: taskId },
				data: { actualHours },
			}),

			db.taskHistory.create({
				data: {
					taskId,
					action: "UPDATED",
					field: "actualHours",
					oldValue: task.actualHours ?? undefined,
					newValue: actualHours,
					actorId: completedById,
				},
			}),
		]);
	}

	/**
	 * Get estimation accuracy metrics for a project
	 */
	async getEstimationAccuracy(projectId: string): Promise<{
		totalTasks: number;
		averageVariance: number;
		overestimatedCount: number;
		underestimatedCount: number;
		accurateCount: number;
	}> {
		const completedTasks = await db.taskNode.findMany({
			where: {
				projectId,
				status: "COMPLETED",
				estimatedHours: { not: null },
				actualHours: { not: null },
			},
			select: {
				estimatedHours: true,
				actualHours: true,
			},
		});

		if (completedTasks.length === 0) {
			return {
				totalTasks: 0,
				averageVariance: 0,
				overestimatedCount: 0,
				underestimatedCount: 0,
				accurateCount: 0,
			};
		}

		let totalVariance = 0;
		let overestimatedCount = 0;
		let underestimatedCount = 0;
		let accurateCount = 0;

		for (const task of completedTasks) {
			const estimated = task.estimatedHours ?? 0;
			const actual = task.actualHours ?? 0;
			const variance = ((actual - estimated) / estimated) * 100;

			totalVariance += Math.abs(variance);

			if (variance > 20) {
				underestimatedCount++;
			} else if (variance < -20) {
				overestimatedCount++;
			} else {
				accurateCount++;
			}
		}

		return {
			totalTasks: completedTasks.length,
			averageVariance: totalVariance / completedTasks.length,
			overestimatedCount,
			underestimatedCount,
			accurateCount,
		};
	}
}

// Singleton instance
export const estimationService = new EstimationService();
