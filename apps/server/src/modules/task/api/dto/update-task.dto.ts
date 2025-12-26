// ============================================
// UPDATE TASK DTO
// ============================================

import { z } from "zod";

export const updateTaskSchema = z.object({
	title: z
		.string()
		.min(1, "Title cannot be empty")
		.max(500, "Title must be less than 500 characters")
		.trim()
		.optional(),
	description: z
		.string()
		.max(10000, "Description must be less than 10000 characters")
		.optional()
		.nullable(),
	nodeType: z
		.enum(["EPIC", "STORY", "TASK", "SUBTASK", "BUG", "SPIKE"])
		.optional(),
	status: z
		.enum([
			"DRAFT",
			"PENDING",
			"IN_PROGRESS",
			"BLOCKED",
			"IN_REVIEW",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
	priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
	assigneeId: z.string().optional().nullable(),
	estimatedHours: z.number().positive().optional().nullable(),
	actualHours: z.number().nonnegative().optional().nullable(),
	dueDate: z.coerce.date().optional().nullable(),
	position: z.number().int().nonnegative().optional(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
	parentId: z.string().optional().nullable(),
	position: z.number().int().nonnegative().optional(),
});

export type MoveTaskDto = z.infer<typeof moveTaskSchema>;

export const taskQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	projectId: z.string().optional(),
	parentId: z.string().optional().nullable(),
	status: z
		.enum([
			"DRAFT",
			"PENDING",
			"IN_PROGRESS",
			"BLOCKED",
			"IN_REVIEW",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
	priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
	nodeType: z
		.enum(["EPIC", "STORY", "TASK", "SUBTASK", "BUG", "SPIKE"])
		.optional(),
	assigneeId: z.string().optional(),
	createdById: z.string().optional(),
	search: z.string().optional(),
	includeCompleted: z.coerce.boolean().default(false),
	dueBefore: z.coerce.date().optional(),
	dueAfter: z.coerce.date().optional(),
	sortBy: z
		.enum([
			"title",
			"createdAt",
			"updatedAt",
			"dueDate",
			"priority",
			"position",
		])
		.default("position"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type TaskQueryDto = z.infer<typeof taskQuerySchema>;

export const bulkStatusUpdateSchema = z.object({
	taskIds: z.array(z.string()).min(1, "At least one task ID is required"),
	status: z.enum([
		"DRAFT",
		"PENDING",
		"IN_PROGRESS",
		"BLOCKED",
		"IN_REVIEW",
		"COMPLETED",
		"CANCELLED",
	]),
});

export type BulkStatusUpdateDto = z.infer<typeof bulkStatusUpdateSchema>;

export const taskHistoryQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	action: z.string().optional(),
});

export type TaskHistoryQueryDto = z.infer<typeof taskHistoryQuerySchema>;
