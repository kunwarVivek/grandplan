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
 * Error class for Anthropic API-specific errors.
 *
 * AnthropicError wraps errors from the Anthropic Claude API, providing additional
 * context such as HTTP status codes and request latency. It includes helper methods
 * to identify common error conditions for appropriate error handling.
 *
 * Common HTTP status codes from Anthropic API:
 * - 400: Invalid request (bad parameters, malformed request)
 * - 401: Authentication failed (invalid API key)
 * - 403: Permission denied (API key lacks required permissions)
 * - 429: Rate limit exceeded (too many requests)
 * - 500: Internal server error
 * - 529: API is overloaded (Anthropic-specific)
 *
 * @example
 * ```typescript
 * try {
 *   const response = await anthropicProvider.complete(request);
 * } catch (error) {
 *   if (error instanceof AnthropicError) {
 *     if (error.isRateLimitError()) {
 *       // Implement exponential backoff
 *       await delay(calculateBackoff(retryCount));
 *       return retry();
 *     }
 *     if (error.isOverloadedError()) {
 *       // Anthropic servers are overloaded, try later
 *       throw new ExternalServiceError('Anthropic', 'Service temporarily unavailable');
 *     }
 *     if (error.isAuthenticationError()) {
 *       logger.error('Invalid Anthropic API key');
 *       throw new AppError('AI service configuration error', 500);
 *     }
 *     // Log latency for monitoring
 *     logger.warn('Anthropic API error', { status: error.status, latencyMs: error.latencyMs });
 *   }
 *   throw error;
 * }
 * ```
 */
export class AnthropicError extends Error {
	/**
	 * Creates a new AnthropicError instance.
	 *
	 * @param message - Error message from the Anthropic API
	 * @param status - HTTP status code returned by the API
	 * @param latencyMs - Time in milliseconds from request start to error
	 */
	constructor(
		message: string,
		public readonly status: number,
		public readonly latencyMs: number,
	) {
		super(message);
		this.name = "AnthropicError";
	}

	/**
	 * Check if this error is due to rate limiting (HTTP 429).
	 *
	 * When rate limited, implement exponential backoff before retrying.
	 *
	 * @returns True if the error is a rate limit error
	 */
	isRateLimitError(): boolean {
		return this.status === 429;
	}

	/**
	 * Check if this error is due to authentication failure (HTTP 401).
	 *
	 * Typically indicates an invalid or expired API key.
	 *
	 * @returns True if the error is an authentication error
	 */
	isAuthenticationError(): boolean {
		return this.status === 401;
	}

	/**
	 * Check if this error is a server-side error (HTTP 5xx).
	 *
	 * Server errors may be transient and worth retrying.
	 *
	 * @returns True if the error is a server error
	 */
	isServerError(): boolean {
		return this.status >= 500;
	}

	/**
	 * Check if this error indicates the Anthropic API is overloaded (HTTP 529).
	 *
	 * This is an Anthropic-specific status code indicating high load.
	 * Consider falling back to an alternative provider or retrying later.
	 *
	 * @returns True if the API is overloaded
	 */
	isOverloadedError(): boolean {
		return this.status === 529;
	}
}
