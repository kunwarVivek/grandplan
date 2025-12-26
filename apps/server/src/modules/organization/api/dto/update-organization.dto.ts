// ============================================
// UPDATE ORGANIZATION DTO
// ============================================

import { z } from "zod";

export const updateOrganizationSchema = z.object({
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
	logo: z.string().url("Logo must be a valid URL").optional().nullable(),
	status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;

export const updateBrandingSchema = z.object({
	primaryColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex color")
		.optional()
		.nullable(),
	secondaryColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Secondary color must be a valid hex color")
		.optional()
		.nullable(),
	fontFamily: z
		.string()
		.max(100, "Font family must be less than 100 characters")
		.optional()
		.nullable(),
	logo: z.string().url("Logo must be a valid URL").optional().nullable(),
	favicon: z.string().url("Favicon must be a valid URL").optional().nullable(),
	customDomain: z
		.string()
		.regex(
			/^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i,
			"Custom domain must be a valid domain",
		)
		.optional()
		.nullable(),
});

export type UpdateBrandingDto = z.infer<typeof updateBrandingSchema>;

export const organizationQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
	sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type OrganizationQueryDto = z.infer<typeof organizationQuerySchema>;

export const memberQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
	roleId: z.string().optional(),
});

export type MemberQueryDto = z.infer<typeof memberQuerySchema>;

export const invitationQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]).optional(),
});

export type InvitationQueryDto = z.infer<typeof invitationQuerySchema>;
