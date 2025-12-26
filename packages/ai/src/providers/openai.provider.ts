// ============================================
// OPENAI PROVIDER IMPLEMENTATION
// ============================================

import OpenAI from "openai";
import type {
	AICompletionRequest,
	AICompletionResponse,
	AIProviderConfig,
} from "../types.js";
import { BaseAIProvider } from "./base.provider.js";

export class OpenAIProvider extends BaseAIProvider {
	readonly name = "openai" as const;
	private client: OpenAI;
	private defaultModel: string;

	constructor(config: AIProviderConfig) {
		super(config);
		this.client = new OpenAI({
			apiKey: config.apiKey,
			timeout: config.timeout ?? 30000,
		});
		this.defaultModel = config.model ?? "gpt-4o";
	}

	async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
		const startTime = Date.now();

		try {
			const messages: OpenAI.ChatCompletionMessageParam[] =
				request.messages.map((m) => ({
					role: m.role,
					content: m.content,
				}));

			const completionParams: OpenAI.ChatCompletionCreateParams = {
				model: this.defaultModel,
				messages,
				max_tokens: request.maxTokens ?? this.config.maxTokens,
				temperature: request.temperature ?? this.config.temperature,
			};

			// Add response format if JSON is requested
			if (request.responseFormat === "json") {
				completionParams.response_format = { type: "json_object" };
			}

			const completion =
				await this.client.chat.completions.create(completionParams);

			const latencyMs = Date.now() - startTime;
			const message = completion.choices[0]?.message;

			if (!message?.content) {
				throw new Error("No content in OpenAI response");
			}

			const response: AICompletionResponse = {
				content: message.content,
				usage: {
					promptTokens: completion.usage?.prompt_tokens ?? 0,
					completionTokens: completion.usage?.completion_tokens ?? 0,
					totalTokens: completion.usage?.total_tokens ?? 0,
				},
				model: completion.model,
				latencyMs,
			};

			// Parse JSON if requested
			if (request.responseFormat === "json") {
				try {
					response.parsedContent = JSON.parse(message.content);
				} catch {
					// Content will remain as string
				}
			}

			return response;
		} catch (error) {
			const latencyMs = Date.now() - startTime;

			if (error instanceof OpenAI.APIError) {
				throw new OpenAIError(
					`OpenAI API error: ${error.message}`,
					error.status ?? 500,
					error.code ?? "unknown",
					latencyMs,
				);
			}

			throw error;
		}
	}
}

/**
 * Custom error class for OpenAI-specific errors
 */
export class OpenAIError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code: string,
		public readonly latencyMs: number,
	) {
		super(message);
		this.name = "OpenAIError";
	}

	isRateLimitError(): boolean {
		return this.status === 429;
	}

	isAuthenticationError(): boolean {
		return this.status === 401;
	}

	isServerError(): boolean {
		return this.status >= 500;
	}
}
