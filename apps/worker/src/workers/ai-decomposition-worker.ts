// ============================================
// AI DECOMPOSITION WORKER - Task decomposition using AI
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import {
	type AIDecompositionJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import OpenAI from "openai";
import {
	AIDecompositionJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

interface AISubtask {
	title: string;
	description?: string;
	priority?: "low" | "medium" | "high" | "urgent";
	estimatedHours?: number;
}

export function registerAIDecompositionWorker(): void {
	queueManager.registerWorker<AIDecompositionJobData, JobResult>(
		"ai:decomposition",
		async (job: Job<AIDecompositionJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				AIDecompositionJobSchema,
				job.data,
				job.id,
				"ai:decomposition"
			);

			const { taskId, workspaceId, depth: _depth = 1, maxSubtasks = 5 } = validatedData;

			console.log(`Processing AI decomposition for task ${taskId}`);

			try {
				// Get task and workspace AI config
				const [task, aiConfig] = await Promise.all([
					db.taskNode.findUnique({
						where: { id: taskId },
						include: {
							parent: true,
							children: true,
						},
					}),
					db.workspaceAIConfig.findFirst({
						where: { workspaceId, isDefault: true },
					}),
				]);

				if (!task) {
					return { success: false, error: "Task not found" };
				}

				if (!aiConfig) {
					return {
						success: false,
						error: "AI not configured for this workspace",
					};
				}

				// Generate subtasks using AI
				const subtasks = await generateSubtasks(task, aiConfig, maxSubtasks);

				// Create AI decision record
				const decision = await db.taskAIDecision.create({
					data: {
						taskId,
						decisionType: "DECOMPOSITION",
						provider: aiConfig.provider,
						model: aiConfig.defaultModel ?? "unknown",
						prompt: `Decompose task: ${task.title}`,
						response: JSON.parse(JSON.stringify(subtasks)),
						confidence: 0.85, // Could be calculated from AI response
						applied: false,
						tokensUsed: 0,
						latencyMs: 0,
					},
				});

				// Emit event for notification
				await eventBus.emit("task.decomposed", {
					id: taskId,
					subtaskIds: [], // Will be filled when applied
					aiDecisionId: decision.id,
				});

				return {
					success: true,
					message: `Generated ${subtasks.length} subtasks`,
					data: {
						decisionId: decision.id,
						subtasks,
					},
				};
			} catch (error) {
				console.error("AI decomposition failed:", error);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 5,
		},
	);

	console.log("AI decomposition worker registered");
}

async function generateSubtasks(
	task: { id: string; title: string; description: string | null },
	aiConfig: { provider: string; defaultModel: string | null; apiKeyEncrypted: string | null },
	maxSubtasks: number,
): Promise<AISubtask[]> {
	const prompt = `You are a project management AI assistant. Decompose the following task into ${maxSubtasks} or fewer subtasks.

Task Title: ${task.title}
${task.description ? `Description: ${task.description}` : ""}

Return a JSON array of subtasks with the following structure:
[
  {
    "title": "Subtask title",
    "description": "Brief description",
    "priority": "low" | "medium" | "high" | "urgent",
    "estimatedHours": number
  }
]

Rules:
- Each subtask should be actionable and specific
- Subtasks should be ordered by logical sequence
- Total estimated hours should be reasonable for the parent task
- Return ONLY valid JSON, no other text`;

	// Decrypt API key (simplified - in production use proper encryption)
	const apiKey = aiConfig.apiKeyEncrypted ?? ""; // Would be decrypted

	if (aiConfig.provider === "openai") {
		const openai = new OpenAI({ apiKey });

		const response = await openai.chat.completions.create({
			model: aiConfig.defaultModel || "gpt-4o",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
			response_format: { type: "json_object" },
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("No response from OpenAI");
		}

		const parsed = JSON.parse(content);
		return Array.isArray(parsed) ? parsed : parsed.subtasks || [];
	}
	if (aiConfig.provider === "anthropic") {
		const anthropic = new Anthropic({ apiKey });

		const response = await anthropic.messages.create({
			model: aiConfig.defaultModel || "claude-3-5-sonnet-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		const content = response.content[0];
		if (!content || content.type !== "text") {
			throw new Error("Unexpected response type from Anthropic");
		}

		// Extract JSON from response
		const jsonMatch = content.text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error("No JSON found in Anthropic response");
		}

		return JSON.parse(jsonMatch[0]);
	}

	throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
}
