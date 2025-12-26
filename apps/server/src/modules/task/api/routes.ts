// ============================================
// TASK ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { taskController } from "./controllers/task.controller.js";

const router = Router();

// Task CRUD
router.get("/", requirePermission("task:read"), (req, res, next) => {
	taskController.list(req, res, next);
});

router.post("/", requirePermission("task:create"), (req, res, next) => {
	taskController.create(req, res, next);
});

router.post(
	"/bulk-status",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.bulkUpdateStatus(req, res, next);
	},
);

router.get("/:id", requirePermission("task:read"), (req, res, next) => {
	taskController.get(req, res, next);
});

router.patch("/:id", requirePermission("task:update"), (req, res, next) => {
	taskController.update(req, res, next);
});

router.post("/:id/move", requirePermission("task:update"), (req, res, next) => {
	taskController.move(req, res, next);
});

router.delete("/:id", requirePermission("task:delete"), (req, res, next) => {
	taskController.delete(req, res, next);
});

// Tree operations
router.get(
	"/:id/children",
	requirePermission("task:read"),
	(req, res, next) => {
		taskController.getChildren(req, res, next);
	},
);

router.get(
	"/:id/descendants",
	requirePermission("task:read"),
	(req, res, next) => {
		taskController.getDescendants(req, res, next);
	},
);

router.get(
	"/:id/ancestors",
	requirePermission("task:read"),
	(req, res, next) => {
		taskController.getAncestors(req, res, next);
	},
);

// Dependencies
router.get(
	"/:id/dependencies",
	requirePermission("task:read"),
	(req, res, next) => {
		taskController.getDependencies(req, res, next);
	},
);

router.post(
	"/:id/dependencies",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.addDependency(req, res, next);
	},
);

router.delete(
	"/:id/dependencies/:toTaskId/:type",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.removeDependency(req, res, next);
	},
);

// History
router.get("/:id/history", requirePermission("task:read"), (req, res, next) => {
	taskController.getHistory(req, res, next);
});

// Comments
router.get(
	"/:id/comments",
	requirePermission("task:read"),
	(req, res, next) => {
		taskController.getComments(req, res, next);
	},
);

router.post(
	"/:id/comments",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.addComment(req, res, next);
	},
);

router.patch(
	"/:id/comments/:commentId",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.updateComment(req, res, next);
	},
);

router.delete(
	"/:id/comments/:commentId",
	requirePermission("task:update"),
	(req, res, next) => {
		taskController.deleteComment(req, res, next);
	},
);

export { router as taskRoutes };
