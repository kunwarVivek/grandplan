// ============================================
// AI PROVIDER FACTORY
// ============================================

import type { AIProvider, AIProviderConfig, AIProviderName } from "../types.js";
import { AnthropicProvider } from "./anthropic.provider.js";
import { OpenAIProvider } from "./openai.provider.js";

/**
 * Factory configuration for creating AI providers
 */
export interface AIFactoryConfig {
	openai?: AIProviderConfig;
	anthropic?: AIProviderConfig;
	defaultProvider?: AIProviderName;
}

/**
 * Factory class for managing AI providers
 */
export class AIProviderFactory {
	private static instance: AIProviderFactory;
	private providers: Map<AIProviderName, AIProvider> = new Map();
	private defaultProvider: AIProviderName = "openai";

	private constructor() {}

	/**
	 * Get the singleton factory instance
	 */
	static getInstance(): AIProviderFactory {
		if (!AIProviderFactory.instance) {
			AIProviderFactory.instance = new AIProviderFactory();
		}
		return AIProviderFactory.instance;
	}

	/**
	 * Initialize the factory with provider configurations
	 */
	initialize(config: AIFactoryConfig): void {
		if (config.openai) {
			this.providers.set("openai", new OpenAIProvider(config.openai));
		}

		if (config.anthropic) {
			this.providers.set("anthropic", new AnthropicProvider(config.anthropic));
		}

		if (config.defaultProvider) {
			this.defaultProvider = config.defaultProvider;
		}

		// Ensure default provider is available
		if (!this.providers.has(this.defaultProvider)) {
			const availableProviders = Array.from(this.providers.keys());
			if (availableProviders.length > 0) {
				this.defaultProvider = availableProviders[0];
			} else {
				throw new Error("No AI providers configured");
			}
		}
	}

	/**
	 * Get a specific provider by name
	 */
	getProvider(name?: AIProviderName): AIProvider {
		const providerName = name ?? this.defaultProvider;
		const provider = this.providers.get(providerName);

		if (!provider) {
			throw new Error(
				`AI provider '${providerName}' not initialized. Available providers: ${Array.from(this.providers.keys()).join(", ")}`,
			);
		}

		return provider;
	}

	/**
	 * Get the default provider
	 */
	getDefaultProvider(): AIProvider {
		return this.getProvider(this.defaultProvider);
	}

	/**
	 * Get the name of the default provider
	 */
	getDefaultProviderName(): AIProviderName {
		return this.defaultProvider;
	}

	/**
	 * Set the default provider
	 */
	setDefaultProvider(name: AIProviderName): void {
		if (!this.providers.has(name)) {
			throw new Error(`Cannot set default: provider '${name}' not initialized`);
		}
		this.defaultProvider = name;
	}

	/**
	 * Check if a provider is available
	 */
	hasProvider(name: AIProviderName): boolean {
		return this.providers.has(name);
	}

	/**
	 * Get all available provider names
	 */
	getAvailableProviders(): AIProviderName[] {
		return Array.from(this.providers.keys());
	}

	/**
	 * Register a custom provider
	 */
	registerProvider(provider: AIProvider): void {
		this.providers.set(provider.name, provider);
	}

	/**
	 * Remove a provider
	 */
	removeProvider(name: AIProviderName): boolean {
		if (name === this.defaultProvider && this.providers.size > 1) {
			// Set a different default before removing
			const remaining = Array.from(this.providers.keys()).filter(
				(n) => n !== name,
			);
			this.defaultProvider = remaining[0];
		}
		return this.providers.delete(name);
	}

	/**
	 * Clear all providers (useful for testing)
	 */
	clear(): void {
		this.providers.clear();
	}
}

// Export singleton instance getter
export function getAIProvider(name?: AIProviderName): AIProvider {
	return AIProviderFactory.getInstance().getProvider(name);
}

// Export factory instance getter
export function getAIFactory(): AIProviderFactory {
	return AIProviderFactory.getInstance();
}

/**
 * Helper function to create a provider without using the factory
 */
export function createProvider(
	name: AIProviderName,
	config: AIProviderConfig,
): AIProvider {
	switch (name) {
		case "openai":
			return new OpenAIProvider(config);
		case "anthropic":
			return new AnthropicProvider(config);
		default:
			throw new Error(`Unknown provider: ${name}`);
	}
}

// Auto-initialize from environment if running on server
if (typeof window === "undefined") {
	const factory = getAIFactory();

	// Check if not already initialized
	if (factory.getAvailableProviders().length === 0) {
		const config: AIFactoryConfig = {};

		if (process.env.OPENAI_API_KEY) {
			config.openai = { apiKey: process.env.OPENAI_API_KEY };
		}
		if (process.env.ANTHROPIC_API_KEY) {
			config.anthropic = { apiKey: process.env.ANTHROPIC_API_KEY };
		}
		if (process.env.AI_PROVIDER) {
			config.defaultProvider = process.env.AI_PROVIDER as "openai" | "anthropic";
		}

		// Only initialize if we have at least one provider
		if (config.openai || config.anthropic) {
			factory.initialize(config);
		}
	}
}
