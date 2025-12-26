// ============================================
// CREATE WORKSPACE DTO
// ============================================

import { z } from "zod";

export const createWorkspaceSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be less than 100 characters")
		.trim(),
	slug: z
		.string()
		.min(1, "Slug is required")
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

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;

export const addMemberSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
	role: z.enum(["ADMIN", "MEMBER", "VIEWER"], {
		errorMap: () => ({ message: "Role must be ADMIN, MEMBER, or VIEWER" }),
	}),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
	role: z.enum(["ADMIN", "MEMBER", "VIEWER"], {
		errorMap: () => ({ message: "Role must be ADMIN, MEMBER, or VIEWER" }),
	}),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
