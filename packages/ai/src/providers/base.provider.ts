// ============================================
// ABSTRACT BASE AI PROVIDER
// ============================================

import {
	formatTaskContextForPrompt,
	getDecompositionPrompt,
} from "../prompts/decomposition.prompt.js";
import { getEstimationPrompt } from "../prompts/estimation.prompt.js";
import { getSuggestionPrompt } from "../prompts/suggestion.prompt.js";
import type {
	AICompletionRequest,
	AICompletionResponse,
	AIMessage,
	AIProvider,
	AIProviderConfig,
	AIProviderName,
	DecompositionOptions,
	DecompositionResult,
	EstimationOptions,
	EstimationResult,
	SuggestionOptions,
	SuggestionResult,
	TaskContext,
} from "../types.js";

export abstract class BaseAIProvider implements AIProvider {
	abstract readonly name: AIProviderName;
	protected config: AIProviderConfig;

	constructor(config: AIProviderConfig) {
		this.config = {
			maxTokens: 4000,
			temperature: 0.7,
			timeout: 30000,
			...config,
		};
	}

	/**
	 * Abstract method to be implemented by specific providers
	 */
	abstract complete(
		request: AICompletionRequest,
	): Promise<AICompletionResponse>;

	/**
	 * Decompose a task into subtasks
	 */
	async decomposeTask(
		task: TaskContext,
		options: DecompositionOptions = {},
	): Promise<DecompositionResult> {
		const { maxSubtasks = 8, targetDepth, includeEstimates = true } = options;

		const systemPrompt = getDecompositionPrompt({
			maxSubtasks,
			targetDepth,
			includeEstimates,
		});

		const userPrompt = formatTaskContextForPrompt(task);

		const response = await this.complete({
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			responseFormat: "json",
			maxTokens: this.config.maxTokens,
			temperature: 0.7,
		});

		// Parse and validate the response
		const parsed = this.parseJsonResponse<DecompositionResult>(
			response.content,
		);

		// Validate with Zod schema
		const { DecompositionResultSchema } = await import("../types.js");
		const validated = DecompositionResultSchema.parse(parsed);

		return validated;
	}

	/**
	 * Estimate time/effort for a task
	 */
	async estimateTask(
		task: TaskContext,
		options: EstimationOptions = {},
	): Promise<EstimationResult> {
		const {
			includeBreakdown = true,
			considerDependencies = true,
			teamVelocity,
		} = options;

		const systemPrompt = getEstimationPrompt({
			includeBreakdown,
			considerDependencies,
			teamVelocity,
		});

		const userPrompt = formatTaskContextForPrompt(task);

		const response = await this.complete({
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			responseFormat: "json",
			maxTokens: this.config.maxTokens,
			temperature: 0.5, // Lower temperature for more consistent estimates
		});

		// Parse and validate the response
		const parsed = this.parseJsonResponse<EstimationResult>(response.content);

		// Validate with Zod schema
		const { EstimationResultSchema } = await import("../types.js");
		const validated = EstimationResultSchema.parse(parsed);

		return validated;
	}

	/**
	 * Generate suggestions for a task
	 */
	async suggestImprovement(
		task: TaskContext,
		options: SuggestionOptions,
	): Promise<SuggestionResult> {
		const systemPrompt = getSuggestionPrompt(options.type);
		const userPrompt = formatTaskContextForPrompt(task);

		const response = await this.complete({
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			responseFormat: "json",
			maxTokens: 2000,
			temperature: 0.6,
		});

		const parsed = this.parseJsonResponse<SuggestionResult>(response.content);

		return {
			type: options.type,
			suggestion: parsed.suggestion,
			confidence: parsed.confidence ?? 0.8,
		};
	}

	/**
	 * Helper to parse JSON response with error handling
	 */
	protected parseJsonResponse<T>(content: string): T {
		try {
			// Handle potential markdown code blocks
			let jsonContent = content.trim();

			// Remove markdown code block if present
			if (jsonContent.startsWith("```json")) {
				jsonContent = jsonContent.slice(7);
			} else if (jsonContent.startsWith("```")) {
				jsonContent = jsonContent.slice(3);
			}

			if (jsonContent.endsWith("```")) {
				jsonContent = jsonContent.slice(0, -3);
			}

			return JSON.parse(jsonContent.trim()) as T;
		} catch (error) {
			throw new Error(
				`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Helper to format messages for logging/debugging
	 */
	protected formatMessagesForLogging(messages: AIMessage[]): string {
		return messages
			.map(
				(m) => `[${m.role.toUpperCase()}]: ${m.content.substring(0, 100)}...`,
			)
			.join("\n");
	}

	/**
	 * Helper to calculate token estimate (rough approximation)
	 */
	protected estimateTokens(text: string): number {
		// Rough estimate: ~4 characters per token for English text
		return Math.ceil(text.length / 4);
	}
}
