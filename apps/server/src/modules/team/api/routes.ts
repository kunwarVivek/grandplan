// ============================================
// TEAM ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { teamController } from "./controllers/team.controller.js";

const router = Router();

// Team CRUD
router.get("/", requirePermission("team:read"), (req, res, next) => {
	teamController.list(req, res, next);
});

router.get("/my-teams", requirePermission("team:read"), (req, res, next) => {
	teamController.listUserTeams(req, res, next);
});

router.post("/", requirePermission("team:create"), (req, res, next) => {
	teamController.create(req, res, next);
});

router.get("/:id", requirePermission("team:read"), (req, res, next) => {
	teamController.get(req, res, next);
});

router.patch("/:id", requirePermission("team:update"), (req, res, next) => {
	teamController.update(req, res, next);
});

router.delete("/:id", requirePermission("team:delete"), (req, res, next) => {
	teamController.delete(req, res, next);
});

// Team Members
router.get("/:id/members", requirePermission("team:read"), (req, res, next) => {
	teamController.listMembers(req, res, next);
});

router.post(
	"/:id/members",
	requirePermission("team:manage_members"),
	(req, res, next) => {
		teamController.addMember(req, res, next);
	},
);

router.patch(
	"/:id/members/:userId",
	requirePermission("team:manage_members"),
	(req, res, next) => {
		teamController.updateMemberRole(req, res, next);
	},
);

router.delete(
	"/:id/members/:userId",
	requirePermission("team:manage_members"),
	(req, res, next) => {
		teamController.removeMember(req, res, next);
	},
);

export { router as teamRoutes };
