// ============================================
// SHARED TYPE DEFINITIONS
// ============================================

// Pagination
export interface PaginationParams {
	page?: number;
	limit?: number;
	cursor?: string;
}

export interface PaginatedResult<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
		nextCursor?: string;
	};
}

// Sorting
export interface SortParams {
	field: string;
	order: "asc" | "desc";
}

// API Response
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
	meta?: {
		requestId: string;
		timestamp: string;
	};
}

// Event types
export interface DomainEvent<T = unknown> {
	id: string;
	type: string;
	aggregateId: string;
	aggregateType: string;
	payload: T;
	metadata: {
		userId?: string;
		organizationId?: string;
		timestamp: Date;
		correlationId?: string;
	};
}

// Task-related types
export type TaskStatusType =
	| "DRAFT"
	| "PENDING"
	| "IN_PROGRESS"
	| "BLOCKED"
	| "IN_REVIEW"
	| "COMPLETED"
	| "CANCELLED";

export type TaskPriorityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type TaskNodeTypeType =
	| "EPIC"
	| "STORY"
	| "TASK"
	| "SUBTASK"
	| "BUG"
	| "SPIKE";

// AI-related types
export interface AIProviderConfig {
	apiKey: string;
	model: string;
	maxTokens: number;
	temperature: number;
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
	schema?: Record<string, unknown>;
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

// Notification types
export type NotificationChannel = "inApp" | "email" | "push" | "slack";

export interface NotificationPayload {
	userId: string;
	type: string;
	title: string;
	body?: string;
	data?: Record<string, unknown>;
	channels?: NotificationChannel[];
}

// Integration types
export type IntegrationType =
	| "slack"
	| "teams"
	| "jira"
	| "asana"
	| "linear"
	| "notion"
	| "google_calendar"
	| "outlook";

export interface IntegrationCredentials {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	metadata?: Record<string, unknown>;
}

// Tenant context
export interface TenantContext {
	userId: string;
	organizationId: string;
	permissions: string[];
	role: string;
}

// Generic result type for operations
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };
