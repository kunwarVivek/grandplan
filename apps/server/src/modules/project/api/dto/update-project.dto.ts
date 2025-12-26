// ============================================
// UPDATE PROJECT DTO
// ============================================

import { z } from "zod";

export const updateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Name cannot be empty")
		.max(100, "Name must be less than 100 characters")
		.trim()
		.optional(),
	description: z
		.string()
		.max(2000, "Description must be less than 2000 characters")
		.optional()
		.nullable(),
	status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
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

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export const projectQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	workspaceId: z.string().optional(),
	status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
	search: z.string().optional(),
	sortBy: z
		.enum(["name", "createdAt", "updatedAt", "status"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;

export const yjsDocumentSchema = z.object({
	state: z.string().min(1, "State is required"), // Base64 encoded Yjs state
});

export type YjsDocumentDto = z.infer<typeof yjsDocumentSchema>;
