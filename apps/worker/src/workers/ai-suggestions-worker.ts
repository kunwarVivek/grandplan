// ============================================
// AI SUGGESTIONS WORKER - AI-powered task suggestions
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@grandplan/db";
import {
	type AISuggestionJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import OpenAI from "openai";
import {
	AISuggestionJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

interface AISuggestion {
	suggestionType: "status" | "priority" | "assignee" | "deadline";
	currentValue: string | null;
	suggestedValue: string;
	reasoning: string;
	confidence: number;
}

export function registerAISuggestionsWorker(): void {
	queueManager.registerWorker<AISuggestionJobData, JobResult>(
		"ai:suggestions",
		async (job: Job<AISuggestionJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				AISuggestionJobSchema,
				job.data,
				job.id,
				"ai:suggestions"
			);

			const { taskId, suggestionType } = validatedData;

			console.log(`Processing AI suggestion: ${suggestionType} for task ${taskId}`);

			try {
				// Get task with context
				const task = await db.taskNode.findUnique({
					where: { id: taskId },
					include: {
						assignee: true,
						parent: true,
						children: true,
						dependenciesFrom: {
							include: { toTask: true },
						},
					},
				});

				if (!task) {
					return { success: false, error: "Task not found" };
				}

				// Get workspace AI config
				const aiConfig = await db.workspaceAIConfig.findFirst({
					where: {
						workspace: {
							projects: {
								some: { id: task.projectId },
							},
						},
						isDefault: true,
					},
				});

				if (!aiConfig) {
					return {
						success: false,
						error: "AI not configured for this workspace",
					};
				}

				// Generate suggestion using AI
				const suggestion = await generateSuggestion(task, aiConfig, suggestionType);

				// Store as AI decision
				const decision = await db.taskAIDecision.create({
					data: {
						taskId,
						decisionType: suggestionType === "status"
							? "STATUS_RECOMMEND"
							: suggestionType === "priority"
							? "PRIORITIZATION"
							: "TITLE_SUGGEST", // Reuse for assignee/deadline
						provider: aiConfig.provider,
						model: aiConfig.defaultModel ?? "unknown",
						prompt: `Suggest ${suggestionType} for task: ${task.title}`,
						response: JSON.parse(JSON.stringify(suggestion)),
						confidence: suggestion.confidence,
						applied: false,
						tokensUsed: 0,
						latencyMs: 0,
					},
				});

				console.log(`AI suggestion generated: ${decision.id} for task ${taskId}`);

				return {
					success: true,
					message: `Generated ${suggestionType} suggestion`,
					data: {
						decisionId: decision.id,
						suggestion,
					},
				};
			} catch (error) {
				console.error("AI suggestion failed:", error);
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

	console.log("AI suggestions worker registered");
}

async function generateSuggestion(
	task: {
		id: string;
		title: string;
		description: string | null;
		status: string;
		priority: string;
		dueDate: Date | null;
		assignee: { id: string; name: string | null } | null;
		children: { status: string }[];
		dependenciesFrom: { toTask: { status: string } }[];
	},
	aiConfig: { provider: string; defaultModel: string | null; apiKeyEncrypted: string | null },
	suggestionType: "status" | "priority" | "assignee" | "deadline",
): Promise<AISuggestion> {
	const completedChildren = task.children.filter(c => c.status === "COMPLETED").length;
	const completedDeps = task.dependenciesFrom.filter(d => d.toTask.status === "COMPLETED").length;

	const contextInfo = `
Task Title: ${task.title}
Description: ${task.description || "None"}
Current Status: ${task.status}
Current Priority: ${task.priority}
Current Assignee: ${task.assignee?.name || "Unassigned"}
Current Due Date: ${task.dueDate?.toISOString() || "None"}
Subtasks: ${task.children.length} (${completedChildren} completed)
Dependencies: ${task.dependenciesFrom.length} (${completedDeps} completed)
`;

	const prompts: Record<string, string> = {
		status: `Based on the task context, suggest the most appropriate status.
Available statuses: DRAFT, PENDING, IN_PROGRESS, BLOCKED, IN_REVIEW, COMPLETED, CANCELLED
Consider: subtask completion, dependency status, current state.`,
		priority: `Based on the task context, suggest the most appropriate priority.
Available priorities: CRITICAL, HIGH, MEDIUM, LOW
Consider: due date proximity, task importance, blocking dependencies.`,
		assignee: `Based on the task context, suggest if the current assignment is appropriate or if reassignment might help.
Provide general guidance rather than specific user recommendations.`,
		deadline: `Based on the task context, suggest an appropriate deadline.
Consider: task complexity, subtask count, current progress, priority.
Return the suggested date in ISO format.`,
	};

	const prompt = `You are a project management AI assistant. Analyze the following task and provide a suggestion.

${contextInfo}

${prompts[suggestionType]}

Return JSON with this structure:
{
  "suggestedValue": "the suggested value",
  "reasoning": "brief explanation of why",
  "confidence": 0.0 to 1.0
}

Return ONLY valid JSON, no other text.`;

	const apiKey = aiConfig.apiKeyEncrypted ?? "";

	let response: AISuggestion;

	if (aiConfig.provider === "openai") {
		const openai = new OpenAI({ apiKey });

		const completion = await openai.chat.completions.create({
			model: aiConfig.defaultModel || "gpt-4o",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.5,
			response_format: { type: "json_object" },
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			throw new Error("No response from OpenAI");
		}

		const parsed = JSON.parse(content);
		response = {
			suggestionType,
			currentValue: getCurrentValue(task, suggestionType),
			suggestedValue: parsed.suggestedValue,
			reasoning: parsed.reasoning,
			confidence: parsed.confidence,
		};
	} else if (aiConfig.provider === "anthropic") {
		const anthropic = new Anthropic({ apiKey });

		const completion = await anthropic.messages.create({
			model: aiConfig.defaultModel || "claude-3-5-sonnet-20241022",
			max_tokens: 512,
			messages: [{ role: "user", content: prompt }],
		});

		const content = completion.content[0];
		if (!content || content.type !== "text") {
			throw new Error("Unexpected response type from Anthropic");
		}

		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON found in Anthropic response");
		}

		const parsed = JSON.parse(jsonMatch[0]);
		response = {
			suggestionType,
			currentValue: getCurrentValue(task, suggestionType),
			suggestedValue: parsed.suggestedValue,
			reasoning: parsed.reasoning,
			confidence: parsed.confidence,
		};
	} else {
		throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
	}

	return response;
}

function getCurrentValue(
	task: {
		status: string;
		priority: string;
		dueDate: Date | null;
		assignee: { name: string | null } | null;
	},
	suggestionType: "status" | "priority" | "assignee" | "deadline",
): string | null {
	switch (suggestionType) {
		case "status":
			return task.status;
		case "priority":
			return task.priority;
		case "assignee":
			return task.assignee?.name || null;
		case "deadline":
			return task.dueDate?.toISOString() || null;
		default:
			return null;
	}
}
