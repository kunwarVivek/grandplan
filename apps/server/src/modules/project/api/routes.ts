// ============================================
// PROJECT ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { projectController } from "./controllers/project.controller.js";

const router = Router();

// Project CRUD
router.get("/", requirePermission("project:read"), (req, res, next) => {
	projectController.list(req, res, next);
});

router.post("/", requirePermission("project:create"), (req, res, next) => {
	projectController.create(req, res, next);
});

router.get("/:id", requirePermission("project:read"), (req, res, next) => {
	projectController.get(req, res, next);
});

router.get(
	"/:id/tasks",
	requirePermission("project:read"),
	(req, res, next) => {
		projectController.getWithTasks(req, res, next);
	},
);

router.patch("/:id", requirePermission("project:update"), (req, res, next) => {
	projectController.update(req, res, next);
});

router.delete("/:id", requirePermission("project:delete"), (req, res, next) => {
	projectController.delete(req, res, next);
});

router.post(
	"/:id/archive",
	requirePermission("project:update"),
	(req, res, next) => {
		projectController.archive(req, res, next);
	},
);

router.get(
	"/:id/stats",
	requirePermission("project:read"),
	(req, res, next) => {
		projectController.getStats(req, res, next);
	},
);

// YJS Document endpoints
router.get(
	"/:id/document",
	requirePermission("project:read"),
	(req, res, next) => {
		projectController.getYjsDocument(req, res, next);
	},
);

router.put(
	"/:id/document",
	requirePermission("project:update"),
	(req, res, next) => {
		projectController.saveYjsDocument(req, res, next);
	},
);

export { router as projectRoutes };
