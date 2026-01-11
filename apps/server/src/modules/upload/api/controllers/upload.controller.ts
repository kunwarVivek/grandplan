// ============================================
// UPLOAD CONTROLLER
// Handles file upload HTTP requests
// ============================================

import type { Response, NextFunction } from "express";
import type { Request as ExpressRequest } from "express-serve-static-core";
import { FileTypeVO, type UploadType } from "../../domain/value-objects/file-type.vo.js";
import { uploadService } from "../../application/services/upload.service.js";

/**
 * Multer file type (simplified to avoid global type dependency)
 */
interface MulterFile {
	originalname: string;
	mimetype: string;
	size: number;
	buffer: Buffer;
}

/**
 * Request with multer file attached
 */
type UploadRequest = ExpressRequest & { file?: MulterFile };

/**
 * POST /api/uploads
 * Upload a file (avatar, logo, or favicon)
 */
export async function uploadFile(
	req: UploadRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const file = req.file;
		const type = req.body.type as string;

		// Validate request has file
		if (!file) {
			res.status(400).json({
				error: "No file provided",
				message: "Please upload a file",
			});
			return;
		}

		// Validate type is provided and valid
		if (!type) {
			res.status(400).json({
				error: "No type provided",
				message: "Please specify file type: avatar, logo, or favicon",
			});
			return;
		}

		if (!FileTypeVO.isValidType(type)) {
			res.status(400).json({
				error: "Invalid type",
				message: "Type must be one of: avatar, logo, favicon",
			});
			return;
		}

		// Process the upload
		const result = await uploadService.upload(
			{
				originalname: file.originalname,
				mimetype: file.mimetype,
				size: file.size,
				buffer: file.buffer,
			},
			type as UploadType,
		);

		if (!result.success) {
			res.status(400).json({
				error: "Upload failed",
				message: result.error,
			});
			return;
		}

		res.status(200).json({
			url: result.url,
			message: "File uploaded successfully",
		});
	} catch (error) {
		next(error);
	}
}
