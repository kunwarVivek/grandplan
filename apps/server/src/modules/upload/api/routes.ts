// ============================================
// UPLOAD MODULE ROUTES
// ============================================

import { Router } from "express";
import multer from "multer";
import { uploadFile } from "./controllers/upload.controller.js";

// Configure multer for memory storage (buffers)
// Maximum file size is 5MB (largest allowed for logo/favicon)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max (further validated per type in service)
	},
});

const router = Router();

// POST /api/uploads - Upload a file
// File should be sent as multipart/form-data with field name "file"
// Type should be sent as form field "type" (avatar, logo, or favicon)
router.post("/", upload.single("file"), uploadFile);

export const uploadRoutes = router;
