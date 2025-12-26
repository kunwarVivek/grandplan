// ============================================
// CREATE TEAM DTO
// ============================================

import { z } from "zod";

export const createTeamSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be less than 100 characters")
		.trim(),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional()
		.nullable(),
});

export type CreateTeamDto = z.infer<typeof createTeamSchema>;

export const addTeamMemberSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
	teamRoleId: z.string().optional().nullable(),
});

export type AddTeamMemberDto = z.infer<typeof addTeamMemberSchema>;

export const updateTeamMemberRoleSchema = z.object({
	teamRoleId: z.string().optional().nullable(),
});

export type UpdateTeamMemberRoleDto = z.infer<
	typeof updateTeamMemberRoleSchema
>;
