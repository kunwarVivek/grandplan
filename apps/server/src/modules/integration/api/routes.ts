// ============================================
// INTEGRATION ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { integrationController } from "./controllers/integration.controller.js";

const router = Router();

// List available integrations (public)
router.get("/", (req, res, next) => {
	integrationController.listAvailable(req, res, next);
});

// List user's connected integrations
router.get(
	"/connections",
	requirePermission("integrations:read"),
	(req, res, next) => {
		integrationController.listConnections(req, res, next);
	},
);

// Initiate OAuth flow
router.post(
	"/:provider/oauth/start",
	requirePermission("integrations:manage"),
	(req, res, next) => {
		integrationController.startOAuth(req, res, next);
	},
);

// OAuth callback handler
router.get("/:provider/oauth/callback", (req, res, next) => {
	integrationController.handleOAuthCallback(req, res, next);
});

// Disconnect integration
router.delete(
	"/connections/:id",
	requirePermission("integrations:manage"),
	(req, res, next) => {
		integrationController.disconnect(req, res, next);
	},
);

// Trigger sync
router.post(
	"/connections/:id/sync",
	requirePermission("integrations:manage"),
	(req, res, next) => {
		integrationController.triggerSync(req, res, next);
	},
);

// Get connection status
router.get(
	"/connections/:id/status",
	requirePermission("integrations:read"),
	(req, res, next) => {
		integrationController.getConnectionStatus(req, res, next);
	},
);

export { router as integrationRoutes };
