// ============================================
// AI MODULE ROUTES
// ============================================

import { Router } from "express";
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

// Task AI Operations
router.post("/decompose/:taskId", decomposeTask);
router.post("/estimate/:taskId", estimateTask);
router.post("/suggest/:taskId", suggestImprovement);

// AI Decisions
router.get("/decisions/:taskId", getDecisionHistory);
router.post("/decisions/:decisionId/apply", applyDecision);
router.post("/decisions/:decisionId/reject", rejectDecision);

// Task Quality
router.get("/quality/:taskId", assessTaskQuality);

// Job Management
router.get("/jobs/:jobId", getJobStatus);
router.get("/stats", getQueueStats);

export const aiRoutes = router;
