// ============================================
// TASK CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core/errors";
import type { NextFunction, Request, Response } from "express";
import { taskService } from "../../application/services/task.service.js";
import {
	addDependencySchema,
	createCommentSchema,
	createTaskSchema,
	updateCommentSchema,
} from "../dto/create-task.dto.js";
import {
	bulkDuplicateSchema,
	bulkStatusUpdateSchema,
	moveTaskSchema,
	taskHistoryQuerySchema,
	taskQuerySchema,
	updateTaskSchema,
} from "../dto/update-task.dto.js";

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

export class TaskController {
	async create(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = createTaskSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const task = await taskService.create(result.data);

			res.status(201).json({
				success: true,
				data: task,
			});
		} catch (error) {
			next(error);
		}
	}

	async get(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const task = await taskService.findById(id);

			res.json({
				success: true,
				data: task,
			});
		} catch (error) {
			next(error);
		}
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const result = taskQuerySchema.safeParse(req.query);
			if (!result.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const tasks = await taskService.list(result.data);

			res.json({
				success: true,
				data: tasks.tasks,
				pagination: {
					page: tasks.page,
					limit: tasks.limit,
					total: tasks.total,
					totalPages: tasks.totalPages,
					hasNext: tasks.page < tasks.totalPages,
					hasPrev: tasks.page > 1,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = updateTaskSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const task = await taskService.update(id, result.data);

			res.json({
				success: true,
				data: task,
			});
		} catch (error) {
			next(error);
		}
	}

	async move(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = moveTaskSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const moveResult = await taskService.move(id, result.data);

			res.json({
				success: true,
				data: moveResult,
			});
		} catch (error) {
			next(error);
		}
	}

	async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = await taskService.delete(id);

			res.json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	}

	async bulkUpdateStatus(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const result = bulkStatusUpdateSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const updateResult = await taskService.bulkUpdateStatus(result.data);

			res.json({
				success: true,
				data: updateResult,
			});
		} catch (error) {
			next(error);
		}
	}

	async bulkDuplicate(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const result = bulkDuplicateSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const duplicateResult = await taskService.bulkDuplicate(result.data);

			res.json({
				success: true,
				data: duplicateResult,
			});
		} catch (error) {
			next(error);
		}
	}

	// Dependencies
	async addDependency(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = addDependencySchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const dependency = await taskService.addDependency(id, result.data);

			res.status(201).json({
				success: true,
				data: dependency,
			});
		} catch (error) {
			next(error);
		}
	}

	async removeDependency(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const toTaskId = requireParam(req.params, "toTaskId");
			const type = requireParam(req.params, "type");
			await taskService.removeDependency(id, toTaskId, type);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	async getDependencies(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const dependencies = await taskService.getDependencies(id);

			res.json({
				success: true,
				data: dependencies,
			});
		} catch (error) {
			next(error);
		}
	}

	// History
	async getHistory(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const queryResult = taskHistoryQuerySchema.safeParse(req.query);
			if (!queryResult.success) {
				throw new ValidationError(
					"Invalid query parameters",
					Object.fromEntries(
						queryResult.error.issues.map((e) => [
							e.path.join("."),
							[e.message],
						]),
					),
				);
			}

			const history = await taskService.getHistory(id, queryResult.data);

			res.json({
				success: true,
				data: history.history,
				pagination: {
					total: history.total,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	// Comments
	async addComment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const result = createCommentSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const comment = await taskService.addComment(id, result.data);

			res.status(201).json({
				success: true,
				data: comment,
			});
		} catch (error) {
			next(error);
		}
	}

	async updateComment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const commentId = requireParam(req.params, "commentId");
			const result = updateCommentSchema.safeParse(req.body);
			if (!result.success) {
				throw new ValidationError(
					"Invalid request data",
					Object.fromEntries(
						result.error.issues.map((e) => [e.path.join("."), [e.message]]),
					),
				);
			}

			const comment = await taskService.updateComment(
				id,
				commentId,
				result.data,
			);

			res.json({
				success: true,
				data: comment,
			});
		} catch (error) {
			next(error);
		}
	}

	async deleteComment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const commentId = requireParam(req.params, "commentId");
			await taskService.deleteComment(id, commentId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	}

	async getComments(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const comments = await taskService.getComments(id);

			res.json({
				success: true,
				data: comments,
			});
		} catch (error) {
			next(error);
		}
	}

	// Tree operations
	async getChildren(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const children = await taskService.getChildren(id);

			res.json({
				success: true,
				data: children,
			});
		} catch (error) {
			next(error);
		}
	}

	async getDescendants(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const descendants = await taskService.getDescendants(id);

			res.json({
				success: true,
				data: descendants,
			});
		} catch (error) {
			next(error);
		}
	}

	async getAncestors(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const id = requireParam(req.params, "id");
			const ancestors = await taskService.getAncestors(id);

			res.json({
				success: true,
				data: ancestors,
			});
		} catch (error) {
			next(error);
		}
	}
}

export const taskController = new TaskController();
