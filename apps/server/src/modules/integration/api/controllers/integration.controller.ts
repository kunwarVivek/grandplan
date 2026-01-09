// ============================================
// INTEGRATION CONTROLLER
// ============================================

import { NotFoundError, ValidationError } from "@grandplan/core";
import type { NextFunction, Request, Response } from "express";
import { integrationService } from "../../application/services/integration.service.js";

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * List all available integrations
 * GET /api/integrations
 */
async function listAvailable(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const integrations = integrationService.getAvailableIntegrations();

		res.status(200).json({
			success: true,
			data: integrations,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * List user's connected integrations
 * GET /api/integrations/connections
 */
async function listConnections(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = req.user as { id: string };
		const connections = await integrationService.getUserConnections(user.id);

		res.status(200).json({
			success: true,
			data: connections,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Initiate OAuth flow for an integration
 * POST /api/integrations/:provider/oauth/start
 */
async function startOAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = req.user as { id: string };
		const { provider } = req.params;

		if (!provider) {
			throw new ValidationError("Provider is required", {
				provider: ["Provider is required"],
			});
		}

		const baseUrl = `${req.protocol}://${req.get("host")}`;

		const result = await integrationService.initiateOAuth(
			user.id,
			provider as Parameters<typeof integrationService.initiateOAuth>[1],
			baseUrl,
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
 * Handle OAuth callback
 * GET /api/integrations/:provider/oauth/callback
 */
async function handleOAuthCallback(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { provider } = req.params;
		const { code, state, error: oauthError } = req.query;

		if (oauthError) {
			throw new ValidationError("OAuth failed", {
				oauth: [oauthError as string],
			});
		}

		if (!provider) {
			throw new ValidationError("Provider is required", {
				provider: ["Provider is required"],
			});
		}

		if (!code || typeof code !== "string") {
			throw new ValidationError("Missing OAuth code", {
				code: ["Code is required"],
			});
		}

		if (!state || typeof state !== "string") {
			throw new ValidationError("Missing OAuth state", {
				state: ["State is required"],
			});
		}

		const user = req.user as { id: string } | undefined;
		if (!user) {
			throw new NotFoundError("User session");
		}

		const connection = await integrationService.completeOAuth(
			provider as Parameters<typeof integrationService.completeOAuth>[0],
			code,
			state,
			user.id,
		);

		res.status(201).json({
			success: true,
			data: connection,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Disconnect an integration
 * DELETE /api/integrations/connections/:id
 */
async function disconnect(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = req.user as { id: string };
		const { id } = req.params;

		if (!id) {
			throw new ValidationError("Connection ID is required", {
				id: ["Connection ID is required"],
			});
		}

		await integrationService.disconnect(id, user.id);

		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

/**
 * Trigger a sync for a connection
 * POST /api/integrations/connections/:id/sync
 */
async function triggerSync(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = req.user as { id: string };
		const { id } = req.params;
		const { direction } = req.body;

		if (!id) {
			throw new ValidationError("Connection ID is required", {
				id: ["Connection ID is required"],
			});
		}

		await integrationService.triggerSync(id, user.id, direction);

		res.status(200).json({
			success: true,
			message: "Sync job queued",
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Get connection status
 * GET /api/integrations/connections/:id/status
 */
async function getConnectionStatus(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = req.user as { id: string };
		const { id } = req.params;

		if (!id) {
			throw new ValidationError("Connection ID is required", {
				id: ["Connection ID is required"],
			});
		}

		const status = await integrationService.getConnectionStatus(id, user.id);

		res.status(200).json({
			success: true,
			data: status,
		});
	} catch (error) {
		next(error);
	}
}

export const integrationController = {
	listAvailable,
	listConnections,
	startOAuth,
	handleOAuthCallback,
	disconnect,
	triggerSync,
	getConnectionStatus,
};
