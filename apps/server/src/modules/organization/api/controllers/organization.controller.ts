// ============================================
// ORGANIZATION CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";
import { organizationService } from "../../application/services/organization.service.js";
import {
	acceptInvitationSchema,
	createOrganizationSchema,
	inviteMemberSchema,
	updateMemberRoleSchema,
} from "../dto/create-organization.dto.js";
import {
	invitationQuerySchema,
	memberQuerySchema,
	organizationQuerySchema,
	updateBrandingSchema,
	updateOrganizationSchema,
} from "../dto/update-organization.dto.js";

function requireParam(
	params: Record<string, string | undefined>,
	name: string,
): string {
	const value = params[name];
	if (!value) {
		throw new ValidationError(`Missing required parameter: ${name}`, {});
	}
	return value;
}

export class OrganizationController {
	async create(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = createOrganizationSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			// Get user ID from request (set by auth middleware)
			const userId = (req as Request & { user?: { id: string } }).user?.id;
			if (!userId) {
				throw new ValidationError("User ID is required", {});
			}

			const organization = await organizationService.create(
				result.data,
				userId,
			);

			res.status(201).json({
				success: true,
				data: organization,
			});
		} catch (error) {
			next(error);
		}
	}

	async get(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const organization = await organizationService.findById(id);

			res.json({
				success: true,
				data: organization,
			});
		} catch (error) {
			next(error);
		}
	}

	async getBySlug(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const slug = requireParam(req.params, "slug");
			const organization = await organizationService.findBySlug(slug);

			res.json({
				success: true,
				data: organization,
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = organizationQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const organizations = await organizationService.list(result.data);

			res.json({
				success: true,
				data: organizations.organizations,
				pagination: {
					page: organizations.page,
					limit: organizations.limit,
					total: organizations.total,
					totalPages: organizations.totalPages,
					hasNext: organizations.page < organizations.totalPages,
					hasPrev: organizations.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateOrganizationSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const organization = await organizationService.update(id, result.data);

			res.json({
				success: true,
				data: organization,
			});
		} catch (error) {
			next(error);
		}
	}

	async updateBranding(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateBrandingSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const organization = await organizationService.updateBranding(
				id,
				result.data,
			);

			res.json({
				success: true,
				data: organization,
			});
		} catch (error) {
			next(error);
		}
	}

	async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			await organizationService.delete(id);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	// Members
	async listMembers(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = memberQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const members = await organizationService.listMembers(id, result.data);

			res.json({
				success: true,
				data: members.members,
				pagination: {
					page: members.page,
					limit: members.limit,
					total: members.total,
					totalPages: members.totalPages,
					hasNext: members.page < members.totalPages,
					hasPrev: members.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async inviteMember(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = inviteMemberSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const invitation = await organizationService.inviteMember(
				id,
				result.data,
			);

			res.status(201).json({
				success: true,
				data: invitation,
			});
		} catch (error) {
			next(error);
		}
	}

	async acceptInvitation(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const result = acceptInvitationSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const userId = (req as Request & { user?: { id: string } }).user?.id;
			if (!userId) {
				throw new ValidationError("User ID is required", {});
			}

			const member = await organizationService.acceptInvitation(
				result.data,
				userId,
			);

			res.json({
				success: true,
				data: member,
			});
		} catch (error) {
			next(error);
		}
	}

	async updateMemberRole(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const memberId = requireParam(req.params, "userId");
			const result = updateMemberRoleSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			await organizationService.updateMemberRole(id, memberId, result.data);

			res.json({
				success: true,
				message: "Member role updated successfully",
			});
		} catch (error) {
			next(error);
		}
	}

	async removeMember(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const memberId = requireParam(req.params, "userId");
			await organizationService.removeMember(id, memberId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	// Invitations
	async listInvitations(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = invitationQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const invitations = await organizationService.listInvitations(
				id,
				result.data,
			);

			res.json({
				success: true,
				data: invitations.invitations,
				pagination: {
					page: invitations.page,
					limit: invitations.limit,
					total: invitations.total,
					totalPages: invitations.totalPages,
					hasNext: invitations.page < invitations.totalPages,
					hasPrev: invitations.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async revokeInvitation(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const invitationId = requireParam(req.params, "invitationId");
			await organizationService.revokeInvitation(id, invitationId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}
}

export const organizationController = new OrganizationController();
