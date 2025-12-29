// ============================================
// AI MODULE ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { aiRateLimit } from "../../../middleware/index.js";
import {
	applyDecision,
	assessTaskQuality,
	decomposeTask,
	estimateTask,
	getDecisionHistory,
	getJobStatus,
	getQueueStats,
	rejectDecision,
	suggestImprovement,
} from "./controllers/ai.controller.js";

const router = Router();

// Apply AI-specific rate limiting to all AI routes
router.use(aiRateLimit);

// Task AI Operations - require tasks:ai permission
router.post("/decompose/:taskId", requirePermission("tasks:ai"), decomposeTask);
router.post("/estimate/:taskId", requirePermission("tasks:ai"), estimateTask);
router.post(
	"/suggest/:taskId",
	requirePermission("tasks:ai"),
	suggestImprovement,
);

// AI Decisions - require tasks:read for viewing, tasks:update for applying
router.get(
	"/decisions/:taskId",
	requirePermission("tasks:read"),
	getDecisionHistory,
);
router.post(
	"/decisions/:decisionId/apply",
	requirePermission("tasks:update"),
	applyDecision,
);
router.post(
	"/decisions/:decisionId/reject",
	requirePermission("tasks:update"),
	rejectDecision,
);

// Task Quality - require tasks:read
router.get(
	"/quality/:taskId",
	requirePermission("tasks:read"),
	assessTaskQuality,
);

// Job Management - require tasks:read for status, admin for stats
router.get("/jobs/:jobId", requirePermission("tasks:read"), getJobStatus);
router.get("/stats", requirePermission("admin:read"), getQueueStats);

export const aiRoutes = router;
