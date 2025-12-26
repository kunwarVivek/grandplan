// ============================================
// UPDATE TEAM DTO
// ============================================

import { z } from "zod";

export const updateTeamSchema = z.object({
	name: z
		.string()
		.min(1, "Name cannot be empty")
		.max(100, "Name must be less than 100 characters")
		.trim()
		.optional(),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional()
		.nullable(),
});

export type UpdateTeamDto = z.infer<typeof updateTeamSchema>;

export const teamQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("name"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type TeamQueryDto = z.infer<typeof teamQuerySchema>;

export const teamMemberQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
});

export type TeamMemberQueryDto = z.infer<typeof teamMemberQuerySchema>;
