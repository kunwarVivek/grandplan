// ============================================
// UPLOAD SERVICE
// Orchestrates file upload operations
// ============================================

import type { UploadType } from "../../domain/value-objects/file-type.vo.js";
import {
	fileValidationService,
	type UploadedFile,
} from "./file-validation.service.js";
import { fileStorageService } from "./file-storage.service.js";

export interface UploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

class UploadService {
	/**
	 * Handles the complete upload process: validation and storage
	 */
	async upload(file: UploadedFile, type: UploadType): Promise<UploadResult> {
		// Validate the file
		const validationResult = fileValidationService.validate(file, type);
		if (!validationResult.valid) {
			return {
				success: false,
				error: validationResult.error,
			};
		}

		// Generate safe filename
		const safeFilename = fileValidationService.generateSafeFilename(
			file.originalname,
			type,
		);

		// Store the file
		const storageResult = await fileStorageService.store(
			file.buffer,
			safeFilename,
			type,
		);

		if (!storageResult.success) {
			return {
				success: false,
				error: storageResult.error,
			};
		}

		return {
			success: true,
			url: storageResult.url,
		};
	}
}

export const uploadService = new UploadService();
