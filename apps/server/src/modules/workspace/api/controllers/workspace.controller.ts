// ============================================
// WORKSPACE CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";
import { workspaceService } from "../../application/services/workspace.service.js";
import {
	addMemberSchema,
	createWorkspaceSchema,
	updateMemberRoleSchema,
} from "../dto/create-workspace.dto.js";
import {
	updateWorkspaceSchema,
	workspaceQuerySchema,
} from "../dto/update-workspace.dto.js";

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

export class WorkspaceController {
	async create(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = createWorkspaceSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const workspace = await workspaceService.create(result.data);

			res.status(201).json({
				success: true,
				data: workspace,
			});
		} catch (error) {
			next(error);
		}
	}

	async get(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const workspace = await workspaceService.findById(id);

			res.json({
				success: true,
				data: workspace,
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = workspaceQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const { page, limit, search, sortBy, sortOrder } = result.data;
			const workspaces = await workspaceService.list({
				page,
				limit,
				search,
				sortBy,
				sortOrder,
			});

			res.json({
				success: true,
				data: workspaces.workspaces,
				pagination: {
					page: workspaces.page,
					limit: workspaces.limit,
					total: workspaces.total,
					totalPages: workspaces.totalPages,
					hasNext: workspaces.page < workspaces.totalPages,
					hasPrev: workspaces.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateWorkspaceSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const workspace = await workspaceService.update(id, result.data);

			res.json({
				success: true,
				data: workspace,
			});
		} catch (error) {
			next(error);
		}
	}

	async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			await workspaceService.delete(id);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	async listMembers(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const members = await workspaceService.listMembers(id);

			res.json({
				success: true,
				data: members,
			});
		} catch (error) {
			next(error);
		}
	}

	async addMember(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = addMemberSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			await workspaceService.addMember(id, result.data);

			res.status(201).json({
				success: true,
				message: "Member added successfully",
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
			const userId = requireParam(req.params, "userId");
			await workspaceService.removeMember(id, userId);

			res.status(204).send();
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
			const userId = requireParam(req.params, "userId");
			const result = updateMemberRoleSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			await workspaceService.updateMemberRole(id, userId, result.data);

			res.json({
				success: true,
				message: "Member role updated successfully",
			});
		} catch (error) {
			next(error);
		}
	}
}

export const workspaceController = new WorkspaceController();
