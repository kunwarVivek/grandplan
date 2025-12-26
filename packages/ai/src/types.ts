// ============================================
// AI PACKAGE TYPE DEFINITIONS
// ============================================

import { z } from "zod";

// ============================================
// CORE AI TYPES
// ============================================

export type AIProviderName = "openai" | "anthropic";

export interface AIProviderConfig {
	apiKey: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
}

export interface AIMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface AICompletionRequest {
	messages: AIMessage[];
	maxTokens?: number;
	temperature?: number;
	responseFormat?: "text" | "json";
	schema?: z.ZodType<unknown>;
}

export interface AICompletionResponse {
	content: string;
	parsedContent?: unknown;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	model: string;
	latencyMs: number;
}

// ============================================
// TASK CONTEXT FOR AI OPERATIONS
// ============================================

export interface TaskContext {
	id: string;
	title: string;
	description?: string | null;
	nodeType: TaskNodeType;
	status: TaskStatus;
	priority: TaskPriority;
	depth: number;
	estimatedHours?: number | null;
	dueDate?: Date | null;
	parentTitle?: string | null;
	parentDescription?: string | null;
	siblingTitles?: string[];
	childrenTitles?: string[];
	projectName?: string;
	projectDescription?: string | null;
	workspaceContext?: string;
}

export type TaskNodeType =
	| "EPIC"
	| "STORY"
	| "TASK"
	| "SUBTASK"
	| "BUG"
	| "SPIKE";
export type TaskStatus =
	| "DRAFT"
	| "PENDING"
	| "IN_PROGRESS"
	| "BLOCKED"
	| "IN_REVIEW"
	| "COMPLETED"
	| "CANCELLED";
export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ============================================
// DECOMPOSITION TYPES
// ============================================

export interface DecompositionOptions {
	maxSubtasks?: number;
	targetDepth?: number;
	includeEstimates?: boolean;
	preserveExisting?: boolean;
}

export interface SubtaskSuggestion {
	title: string;
	description: string;
	nodeType: TaskNodeType;
	estimatedHours?: number;
	priority: TaskPriority;
	order: number;
	dependencies?: string[];
}

export interface DecompositionResult {
	subtasks: SubtaskSuggestion[];
	reasoning: string;
	confidence: number;
	suggestedApproach?: string;
	warnings?: string[];
}

// Zod schema for validation
export const SubtaskSuggestionSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(2000),
	nodeType: z.enum(["EPIC", "STORY", "TASK", "SUBTASK", "BUG", "SPIKE"]),
	estimatedHours: z.number().min(0).max(1000).optional(),
	priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
	order: z.number().int().min(0),
	dependencies: z.array(z.string()).optional(),
});

export const DecompositionResultSchema = z.object({
	subtasks: z.array(SubtaskSuggestionSchema),
	reasoning: z.string(),
	confidence: z.number().min(0).max(1),
	suggestedApproach: z.string().optional(),
	warnings: z.array(z.string()).optional(),
});

// ============================================
// ESTIMATION TYPES
// ============================================

export interface EstimationOptions {
	includeBreakdown?: boolean;
	considerDependencies?: boolean;
	teamVelocity?: number; // Story points per sprint
}

export interface EstimationBreakdown {
	category: string;
	hours: number;
	confidence: number;
	notes?: string;
}

export interface EstimationResult {
	estimatedHours: number;
	confidence: number;
	breakdown?: EstimationBreakdown[];
	reasoning: string;
	assumptions?: string[];
	risks?: string[];
	suggestedRange?: {
		optimistic: number;
		realistic: number;
		pessimistic: number;
	};
}

export const EstimationBreakdownSchema = z.object({
	category: z.string(),
	hours: z.number().min(0),
	confidence: z.number().min(0).max(1),
	notes: z.string().optional(),
});

export const EstimationResultSchema = z.object({
	estimatedHours: z.number().min(0),
	confidence: z.number().min(0).max(1),
	breakdown: z.array(EstimationBreakdownSchema).optional(),
	reasoning: z.string(),
	assumptions: z.array(z.string()).optional(),
	risks: z.array(z.string()).optional(),
	suggestedRange: z
		.object({
			optimistic: z.number().min(0),
			realistic: z.number().min(0),
			pessimistic: z.number().min(0),
		})
		.optional(),
});

// ============================================
// SUGGESTION TYPES
// ============================================

export type SuggestionType =
	| "title"
	| "description"
	| "priority"
	| "status"
	| "assignee"
	| "deadline"
	| "dependencies";

export interface SuggestionOptions {
	type: SuggestionType;
	context?: Record<string, unknown>;
}

export interface TitleSuggestion {
	suggested: string;
	alternatives: string[];
	reasoning: string;
	improvements: string[];
}

export interface DescriptionSuggestion {
	suggested: string;
	sections?: {
		overview?: string;
		acceptanceCriteria?: string[];
		technicalNotes?: string;
		outOfScope?: string[];
	};
	reasoning: string;
}

export interface PrioritySuggestion {
	suggested: TaskPriority;
	reasoning: string;
	factors: Array<{
		factor: string;
		impact: "high" | "medium" | "low";
		direction: "increase" | "decrease";
	}>;
}

export interface StatusSuggestion {
	suggested: TaskStatus;
	reasoning: string;
	blockers?: string[];
	nextSteps?: string[];
}

export interface SuggestionResult {
	type: SuggestionType;
	suggestion:
		| TitleSuggestion
		| DescriptionSuggestion
		| PrioritySuggestion
		| StatusSuggestion;
	confidence: number;
}

// ============================================
// AI PROVIDER INTERFACE
// ============================================

export interface AIProvider {
	readonly name: AIProviderName;

	/**
	 * Perform a completion request
	 */
	complete(request: AICompletionRequest): Promise<AICompletionResponse>;

	/**
	 * Decompose a task into subtasks
	 */
	decomposeTask(
		task: TaskContext,
		options?: DecompositionOptions,
	): Promise<DecompositionResult>;

	/**
	 * Estimate time/effort for a task
	 */
	estimateTask(
		task: TaskContext,
		options?: EstimationOptions,
	): Promise<EstimationResult>;

	/**
	 * Generate suggestions for a task
	 */
	suggestImprovement(
		task: TaskContext,
		options: SuggestionOptions,
	): Promise<SuggestionResult>;
}

// ============================================
// AI DECISION TRACKING
// ============================================

export type AIDecisionType =
	| "DECOMPOSITION"
	| "ESTIMATION"
	| "PRIORITIZATION"
	| "DEPENDENCY_DETECT"
	| "STATUS_RECOMMEND"
	| "RECALIBRATION"
	| "TITLE_SUGGEST"
	| "DESCRIPTION_ENRICH";

export interface AIDecision {
	taskId: string;
	decisionType: AIDecisionType;
	provider: AIProviderName;
	model: string;
	prompt: string;
	response: unknown;
	reasoning?: string;
	confidence: number;
	tokensUsed: number;
	latencyMs: number;
	requestedById?: string;
}
