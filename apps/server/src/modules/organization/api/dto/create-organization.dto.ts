// ============================================
// CREATE ORGANIZATION DTO
// ============================================

import { z } from "zod";

export const createOrganizationSchema = z.object({
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
	logo: z.string().url("Logo must be a valid URL").optional().nullable(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

export const inviteMemberSchema = z.object({
	email: z
		.string()
		.email("Invalid email address")
		.max(255, "Email must be less than 255 characters"),
	roleId: z.string().min(1, "Role ID is required"),
	teamId: z.string().optional().nullable(),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
	roleId: z.string().min(1, "Role ID is required"),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;

export const acceptInvitationSchema = z.object({
	token: z.string().min(1, "Token is required"),
});

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
