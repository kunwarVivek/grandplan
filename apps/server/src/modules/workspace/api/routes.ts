// ============================================
// WORKSPACE ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { workspaceController } from "./controllers/workspace.controller.js";

const router = Router();

// Workspace CRUD
router.get("/", requirePermission("workspace:read"), (req, res, next) => {
	workspaceController.list(req, res, next);
});

router.post("/", requirePermission("workspace:create"), (req, res, next) => {
	workspaceController.create(req, res, next);
});

router.get("/:id", requirePermission("workspace:read"), (req, res, next) => {
	workspaceController.get(req, res, next);
});

router.patch(
	"/:id",
	requirePermission("workspace:update"),
	(req, res, next) => {
		workspaceController.update(req, res, next);
	},
);

router.delete(
	"/:id",
	requirePermission("workspace:delete"),
	(req, res, next) => {
		workspaceController.delete(req, res, next);
	},
);

// Workspace Members
router.get(
	"/:id/members",
	requirePermission("workspace:read"),
	(req, res, next) => {
		workspaceController.listMembers(req, res, next);
	},
);

router.post(
	"/:id/members",
	requirePermission("workspace:manage_members"),
	(req, res, next) => {
		workspaceController.addMember(req, res, next);
	},
);

router.delete(
	"/:id/members/:userId",
	requirePermission("workspace:manage_members"),
	(req, res, next) => {
		workspaceController.removeMember(req, res, next);
	},
);

router.patch(
	"/:id/members/:userId",
	requirePermission("workspace:manage_members"),
	(req, res, next) => {
		workspaceController.updateMemberRole(req, res, next);
	},
);

export { router as workspaceRoutes };
