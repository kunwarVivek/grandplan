// ============================================
// UPDATE WORKSPACE DTO
// ============================================

import { z } from "zod";

export const updateWorkspaceSchema = z.object({
	name: z
		.string()
		.min(1, "Name cannot be empty")
		.max(100, "Name must be less than 100 characters")
		.trim()
		.optional(),
	slug: z
		.string()
		.min(1, "Slug cannot be empty")
		.max(50, "Slug must be less than 50 characters")
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			"Slug must be lowercase alphanumeric with hyphens",
		)
		.optional(),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional()
		.nullable(),
});

export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;

export const workspaceQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type WorkspaceQueryDto = z.infer<typeof workspaceQuerySchema>;
