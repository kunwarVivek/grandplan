// ============================================
// PROJECT CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";
import { projectService } from "../../application/services/project.service.js";
import { createProjectSchema } from "../dto/create-project.dto.js";
import {
	projectQuerySchema,
	updateProjectSchema,
	yjsDocumentSchema,
} from "../dto/update-project.dto.js";

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

export class ProjectController {
	async create(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = createProjectSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const project = await projectService.create(result.data);

			res.status(201).json({
				success: true,
				data: project,
			});
		} catch (error) {
			next(error);
		}
	}

	async get(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const project = await projectService.findById(id);

			res.json({
				success: true,
				data: project,
			});
		} catch (error) {
			next(error);
		}
	}

	async getWithTasks(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const project = await projectService.findByIdWithTasks(id);

			res.json({
				success: true,
				data: project,
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = projectQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const projects = await projectService.list(result.data);

			res.json({
				success: true,
				data: projects.projects,
				pagination: {
					page: projects.page,
					limit: projects.limit,
					total: projects.total,
					totalPages: projects.totalPages,
					hasNext: projects.page < projects.totalPages,
					hasPrev: projects.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateProjectSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const project = await projectService.update(id, result.data);

			res.json({
				success: true,
				data: project,
			});
		} catch (error) {
			next(error);
		}
	}

	async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			await projectService.delete(id);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	async archive(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const project = await projectService.archive(id);

			res.json({
				success: true,
				data: project,
			});
		} catch (error) {
			next(error);
		}
	}

	async getStats(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const stats = await projectService.getStats(id);

			res.json({
				success: true,
				data: stats,
			});
		} catch (error) {
			next(error);
		}
	}

	async getYjsDocument(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const doc = await projectService.getYjsDocument(id);

			if (!doc) {
				res.json({
					success: true,
					data: null,
				});
				return;
			}

			res.json({
				success: true,
				data: doc,
			});
		} catch (error) {
			next(error);
		}
	}

	async saveYjsDocument(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = yjsDocumentSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			await projectService.saveYjsDocument(id, result.data.state);

			res.json({
				success: true,
				message: "Document saved successfully",
			});
		} catch (error) {
			next(error);
		}
	}
}

export const projectController = new ProjectController();
