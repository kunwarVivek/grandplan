// ============================================
// TEAM CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";
import { teamService } from "../../application/services/team.service.js";
import {
	addTeamMemberSchema,
	createTeamSchema,
	updateTeamMemberRoleSchema,
} from "../dto/create-team.dto.js";
import {
	teamMemberQuerySchema,
	teamQuerySchema,
	updateTeamSchema,
} from "../dto/update-team.dto.js";

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

export class TeamController {
	async create(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = createTeamSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const team = await teamService.create(result.data);

			res.status(201).json({
				success: true,
				data: team,
			});
		} catch (error) {
			next(error);
		}
	}

	async get(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const team = await teamService.findById(id);

			res.json({
				success: true,
				data: team,
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = teamQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const teams = await teamService.list(result.data);

			res.json({
				success: true,
				data: teams.teams,
				pagination: {
					page: teams.page,
					limit: teams.limit,
					total: teams.total,
					totalPages: teams.totalPages,
					hasNext: teams.page < teams.totalPages,
					hasPrev: teams.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async listUserTeams(
		_req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const teams = await teamService.listUserTeams();

			res.json({
				success: true,
				data: teams,
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateTeamSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const team = await teamService.update(id, result.data);

			res.json({
				success: true,
				data: team,
			});
		} catch (error) {
			next(error);
		}
	}

	async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			await teamService.delete(id);

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
			const result = teamMemberQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const members = await teamService.listMembers(id, result.data);

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

	async addMember(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = addTeamMemberSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const member = await teamService.addMember(id, result.data);

			res.status(201).json({
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
			const userId = requireParam(req.params, "userId");
			const result = updateTeamMemberRoleSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			await teamService.updateMemberRole(id, userId, result.data);

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
			const userId = requireParam(req.params, "userId");
			await teamService.removeMember(id, userId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}
}

export const teamController = new TeamController();
