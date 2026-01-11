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
 * Error class for OpenAI API-specific errors.
 *
 * OpenAIError wraps errors from the OpenAI API, providing additional context
 * such as HTTP status codes, error codes, and request latency. It includes
 * helper methods to identify common error conditions for appropriate handling.
 *
 * Common HTTP status codes from OpenAI API:
 * - 400: Bad request (invalid parameters)
 * - 401: Authentication failed (invalid API key)
 * - 403: Permission denied or content policy violation
 * - 429: Rate limit exceeded or quota exhausted
 * - 500: Internal server error
 * - 503: Service unavailable (high load)
 *
 * Common error codes from OpenAI:
 * - "invalid_api_key": API key is invalid
 * - "rate_limit_exceeded": Too many requests
 * - "insufficient_quota": API quota exhausted
 * - "context_length_exceeded": Input too long for model
 * - "content_filter": Content filtered due to policy
 *
 * @example
 * ```typescript
 * try {
 *   const response = await openaiProvider.complete(request);
 * } catch (error) {
 *   if (error instanceof OpenAIError) {
 *     if (error.isRateLimitError()) {
 *       // Implement exponential backoff
 *       await delay(calculateBackoff(retryCount));
 *       return retry();
 *     }
 *     if (error.code === 'context_length_exceeded') {
 *       // Truncate input and retry
 *       return retryWithShorterInput();
 *     }
 *     if (error.isAuthenticationError()) {
 *       logger.error('Invalid OpenAI API key');
 *       throw new AppError('AI service configuration error', 500);
 *     }
 *     // Log for monitoring
 *     logger.warn('OpenAI API error', {
 *       status: error.status,
 *       code: error.code,
 *       latencyMs: error.latencyMs
 *     });
 *   }
 *   throw error;
 * }
 * ```
 */
export class OpenAIError extends Error {
	/**
	 * Creates a new OpenAIError instance.
	 *
	 * @param message - Error message from the OpenAI API
	 * @param status - HTTP status code returned by the API
	 * @param code - OpenAI-specific error code (e.g., "rate_limit_exceeded")
	 * @param latencyMs - Time in milliseconds from request start to error
	 */
	constructor(
		message: string,
		public readonly status: number,
		public readonly code: string,
		public readonly latencyMs: number,
	) {
		super(message);
		this.name = "OpenAIError";
	}

	/**
	 * Check if this error is due to rate limiting (HTTP 429).
	 *
	 * When rate limited, implement exponential backoff before retrying.
	 * Note: This can indicate either request rate limits or quota exhaustion.
	 *
	 * @returns True if the error is a rate limit error
	 */
	isRateLimitError(): boolean {
		return this.status === 429;
	}

	/**
	 * Check if this error is due to authentication failure (HTTP 401).
	 *
	 * Typically indicates an invalid, expired, or revoked API key.
	 *
	 * @returns True if the error is an authentication error
	 */
	isAuthenticationError(): boolean {
		return this.status === 401;
	}

	/**
	 * Check if this error is a server-side error (HTTP 5xx).
	 *
	 * Server errors may be transient and worth retrying with backoff.
	 *
	 * @returns True if the error is a server error
	 */
	isServerError(): boolean {
		return this.status >= 500;
	}
}
