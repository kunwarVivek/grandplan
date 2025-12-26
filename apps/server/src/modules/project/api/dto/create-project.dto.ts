// ============================================
// CREATE PROJECT DTO
// ============================================

import { z } from "zod";

export const createProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be less than 100 characters")
		.trim(),
	description: z
		.string()
		.max(2000, "Description must be less than 2000 characters")
		.optional()
		.nullable(),
	workspaceId: z.string().min(1, "Workspace ID is required"),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
		.optional()
		.nullable(),
	icon: z
		.string()
		.max(50, "Icon identifier must be less than 50 characters")
		.optional()
		.nullable(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const projectIdParamSchema = z.object({
	id: z.string().min(1, "Project ID is required"),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
