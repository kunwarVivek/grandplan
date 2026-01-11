// ============================================
// ANTHROPIC PROVIDER IMPLEMENTATION
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import type {
	AICompletionRequest,
	AICompletionResponse,
	AIProviderConfig,
} from "../types.js";
import { BaseAIProvider } from "./base.provider.js";

export class AnthropicProvider extends BaseAIProvider {
	readonly name = "anthropic" as const;
	private client: Anthropic;
	private defaultModel: string;

	constructor(config: AIProviderConfig) {
		super(config);
		this.client = new Anthropic({
			apiKey: config.apiKey,
			timeout: config.timeout ?? 30000,
		});
		this.defaultModel = config.model ?? "claude-sonnet-4-20250514";
	}

	async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
		const startTime = Date.now();

		try {
			// Separate system message from other messages
			const systemMessage = request.messages.find((m) => m.role === "system");
			const otherMessages = request.messages.filter((m) => m.role !== "system");

			// Convert messages to Anthropic format
			const messages: Anthropic.MessageParam[] = otherMessages.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			}));

			// Ensure messages alternate between user and assistant
			// Add a user message if the first message is from assistant
			if (messages.length > 0 && messages[0]?.role === "assistant") {
				messages.unshift({ role: "user", content: "Please proceed." });
			}

			// Build request params
			const params: Anthropic.MessageCreateParams = {
				model: this.defaultModel,
				max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4000,
				messages,
			};

			// Add system message if present
			if (systemMessage) {
				let systemContent = systemMessage.content;

				// For JSON responses, add instruction to Anthropic
				if (request.responseFormat === "json") {
					systemContent +=
						"\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object.";
				}

				params.system = systemContent;
			}

			const response = await this.client.messages.create(params);

			const latencyMs = Date.now() - startTime;

			// Extract text content from response
			const textContent = response.content.find(
				(block) => block.type === "text",
			);
			if (!textContent || textContent.type !== "text") {
				throw new Error("No text content in Anthropic response");
			}

			const result: AICompletionResponse = {
				content: textContent.text,
				usage: {
					promptTokens: response.usage.input_tokens,
					completionTokens: response.usage.output_tokens,
					totalTokens:
						response.usage.input_tokens + response.usage.output_tokens,
				},
				model: response.model,
				latencyMs,
			};

			// Parse JSON if requested
			if (request.responseFormat === "json") {
				try {
					result.parsedContent = this.parseJsonResponse(textContent.text);
				} catch {
					// Content will remain as string
				}
			}

			return result;
		} catch (error) {
			const latencyMs = Date.now() - startTime;

			if (error instanceof Anthropic.APIError) {
				throw new AnthropicError(
					`Anthropic API error: ${error.message}`,
					error.status ?? 500,
					latencyMs,
				);
			}

			throw error;
		}
	}
}

/**
 * Custom error class for Anthropic-specific errors
 */
export class AnthropicError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly latencyMs: number,
	) {
		super(message);
		this.name = "AnthropicError";
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

	isOverloadedError(): boolean {
		return this.status === 529;
	}
}
