// ============================================
// AI CONTROLLER
// ============================================

import { ValidationError } from "@grandplan/core";
import { getCurrentTenant } from "@grandplan/tenant";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { aiJobService } from "../../application/services/ai-job.service.js";
import { aiOrchestrator } from "../../application/services/ai-orchestrator.service.js";

// ============================================
// REQUEST VALIDATION SCHEMAS
// ============================================

const DecomposeRequestSchema = z.object({
	maxSubtasks: z.number().int().min(1).max(20).optional(),
	includeEstimates: z.boolean().optional(),
	autoApply: z.boolean().optional(),
	async: z.boolean().optional(), // Queue for background processing
	provider: z.enum(["openai", "anthropic"]).optional(),
});

const EstimateRequestSchema = z.object({
	includeBreakdown: z.boolean().optional(),
	autoApply: z.boolean().optional(),
	async: z.boolean().optional(),
	provider: z.enum(["openai", "anthropic"]).optional(),
});

const SuggestRequestSchema = z.object({
	type: z.enum([
		"title",
		"description",
		"priority",
		"status",
		"assignee",
		"deadline",
		"dependencies",
	]),
	provider: z.enum(["openai", "anthropic"]).optional(),
});

const ApplyDecisionRequestSchema = z.object({
	value: z.unknown().optional(), // Optional override value
});

const RejectDecisionRequestSchema = z.object({
	reason: z.string().min(1).max(500),
});

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Decompose a task into subtasks
 * POST /api/ai/decompose/:taskId
 */
export async function decomposeTask(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { taskId } = req.params;
		const parseResult = DecomposeRequestSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		const body = parseResult.data;

		// Queue for async processing if requested
		if (body.async) {
			const jobId = await aiJobService.queueDecomposition({
				taskId,
				workspaceId: context.workspaceId ?? "",
				maxSubtasks: body.maxSubtasks,
				provider: body.provider,
				userId: context.userId,
				organizationId: context.organizationId,
			});

			res.status(202).json({
				success: true,
				data: {
					jobId,
					status: "queued",
					message: "Decomposition job queued for processing",
				},
			});
			return;
		}

		// Synchronous processing
		const result = await aiOrchestrator.decomposeTask(
			{
				taskId,
				maxSubtasks: body.maxSubtasks,
				includeEstimates: body.includeEstimates,
				autoApply: body.autoApply,
				provider: body.provider,
			},
			context,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Estimate a task
 * POST /api/ai/estimate/:taskId
 */
export async function estimateTask(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { taskId } = req.params;
		const parseResult = EstimateRequestSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		const body = parseResult.data;

		// Queue for async processing if requested
		if (body.async) {
			const jobId = await aiJobService.queueEstimation({
				taskId,
				provider: body.provider,
				userId: context.userId,
				organizationId: context.organizationId,
			});

			res.status(202).json({
				success: true,
				data: {
					jobId,
					status: "queued",
					message: "Estimation job queued for processing",
				},
			});
			return;
		}

		// Synchronous processing
		const result = await aiOrchestrator.estimateTask(
			{
				taskId,
				includeBreakdown: body.includeBreakdown,
				autoApply: body.autoApply,
				provider: body.provider,
			},
			context,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get suggestions for a task
 * POST /api/ai/suggest/:taskId
 */
export async function suggestImprovement(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { taskId } = req.params;
		const parseResult = SuggestRequestSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		const body = parseResult.data;

		const result = await aiOrchestrator.suggestImprovement(
			{
				taskId,
				type: body.type,
				provider: body.provider,
			},
			context,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get AI decision history for a task
 * GET /api/ai/decisions/:taskId
 */
export async function getDecisionHistory(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { taskId } = req.params;

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		const decisions = await aiOrchestrator.getDecisionHistory(taskId, context);

		res.status(200).json({
			success: true,
			data: decisions,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Apply a pending AI decision
 * POST /api/ai/decisions/:decisionId/apply
 */
export async function applyDecision(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { decisionId } = req.params;
		const parseResult = ApplyDecisionRequestSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		await aiOrchestrator.applyDecision(decisionId, context);

		res.status(200).json({
			success: true,
			message: "Decision applied successfully",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Reject a pending AI decision
 * POST /api/ai/decisions/:decisionId/reject
 */
export async function rejectDecision(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { decisionId } = req.params;
		const parseResult = RejectDecisionRequestSchema.safeParse(req.body);

		if (!parseResult.success) {
			throw new ValidationError("Invalid request", {
				body: parseResult.error.errors.map((e) => e.message),
			});
		}

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		await aiOrchestrator.rejectDecision(
			decisionId,
			parseResult.data.reason,
			context,
		);

		res.status(200).json({
			success: true,
			message: "Decision rejected",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Assess task quality
 * GET /api/ai/quality/:taskId
 */
export async function assessTaskQuality(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { taskId } = req.params;

		const tenant = getCurrentTenant();
		const context = {
			userId: tenant.userId,
			organizationId: tenant.organizationId,
			workspaceId: tenant.workspaceId,
		};

		const assessment = await aiOrchestrator.assessTaskQuality(taskId, context);

		res.status(200).json({
			success: true,
			data: assessment,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get AI job status
 * GET /api/ai/jobs/:jobId
 */
export async function getJobStatus(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { jobId } = req.params;
		const { queue } = req.query;

		const queueName =
			queue === "suggestions" ? "ai:suggestions" : "ai:decomposition";
		const status = await aiJobService.getJobStatus(queueName, jobId);

		res.status(200).json({
			success: true,
			data: status,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get AI queue statistics
 * GET /api/ai/stats
 */
export async function getQueueStats(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const stats = await aiJobService.getQueueStats();

		res.status(200).json({
			success: true,
			data: stats,
		});
	} catch (error) {
		next(error);
	}
}
