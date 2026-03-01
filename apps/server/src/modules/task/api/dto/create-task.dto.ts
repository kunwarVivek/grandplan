// ============================================
// CREATE TASK DTO
// ============================================

import { z } from "zod";

export const createTaskSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(500, "Title must be less than 500 characters")
		.trim(),
	description: z
		.string()
		.max(10000, "Description must be less than 10000 characters")
		.optional()
		.nullable(),
	projectId: z.string().min(1, "Project ID is required"),
	parentId: z.string().optional().nullable(),
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
	dueDate: z.coerce.date().optional().nullable(),
	position: z.number().int().nonnegative().optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const addDependencySchema = z.object({
	toTaskId: z.string().min(1, "Target task ID is required"),
	type: z.enum(["BLOCKS", "REQUIRED_BY", "RELATED_TO"]),
});

export type AddDependencyDto = z.infer<typeof addDependencySchema>;

export const createCommentSchema = z.object({
	content: z
		.string()
		.min(1, "Content is required")
		.max(10000, "Content must be less than 10000 characters")
		.trim(),
	parentId: z.string().optional().nullable(),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
	content: z
		.string()
		.min(1, "Content is required")
		.max(10000, "Content must be less than 10000 characters")
		.trim(),
});

export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
