// ============================================
// AI PACKAGE - Main Export
// ============================================

// Prompts (for customization)
export {
	formatTaskContextForPrompt,
	getDecompositionPrompt,
	getDependencyDetectionPrompt,
	getRedecompositionPrompt,
} from "./prompts/decomposition.prompt.js";
export {
	getBatchEstimationPrompt,
	getCalibrationPrompt,
	getComplexityAnalysisPrompt,
	getEstimationPrompt,
} from "./prompts/estimation.prompt.js";
export {
	getBatchSuggestionPrompt,
	getQualityAssessmentPrompt,
	getSuggestionPrompt,
} from "./prompts/suggestion.prompt.js";
export {
	AnthropicError,
	AnthropicProvider,
} from "./providers/anthropic.provider.js";
// Providers
export { BaseAIProvider } from "./providers/base.provider.js";
export { OpenAIError, OpenAIProvider } from "./providers/openai.provider.js";
export {
	type AIFactoryConfig,
	AIProviderFactory,
	createProvider,
	getAIFactory,
	getAIProvider,
} from "./providers/provider-factory.js";
// Services
export {
	type DecomposeTaskInput,
	type DecomposeTaskOutput,
	DecompositionService,
	decompositionService,
} from "./services/decomposition.service.js";
export {
	type BatchEstimateInput,
	type BatchEstimateOutput,
	type EstimateTaskInput,
	type EstimateTaskOutput,
	EstimationService,
	estimationService,
} from "./services/estimation.service.js";
export {
	type QualityAssessment,
	type SuggestImprovementInput,
	type SuggestImprovementOutput,
	SuggestionService,
	suggestionService,
} from "./services/suggestion.service.js";
// Types
export * from "./types.js";
