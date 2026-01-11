// ============================================
// FILE VALIDATION SERVICE
// Validates uploaded files for type, size, and format
// ============================================

import path from "node:path";
import { FileTypeVO, type UploadType } from "../../domain/value-objects/file-type.vo.js";

export interface FileValidationResult {
	valid: boolean;
	error?: string;
}

export interface UploadedFile {
	originalname: string;
	mimetype: string;
	size: number;
	buffer: Buffer;
}

class FileValidationService {
	/**
	 * Validates an uploaded file against the constraints for its type
	 */
	validate(file: UploadedFile, type: UploadType): FileValidationResult {
		// Create file type value object (validates type itself)
		let fileType: FileTypeVO;
		try {
			fileType = FileTypeVO.create(type);
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : "Invalid upload type",
			};
		}

		// Validate file size
		if (!fileType.isWithinSizeLimit(file.size)) {
			return {
				valid: false,
				error: `File size exceeds ${fileType.maxSizeMB}MB limit for ${type}`,
			};
		}

		// Validate MIME type
		if (!fileType.isAllowedMimeType(file.mimetype)) {
			return {
				valid: false,
				error: `File type ${file.mimetype} is not allowed for ${type}. Allowed types: ${fileType.allowedMimeTypes.join(", ")}`,
			};
		}

		// Validate file extension
		const extension = path.extname(file.originalname).toLowerCase();
		if (extension && !fileType.isAllowedExtension(extension)) {
			return {
				valid: false,
				error: `File extension ${extension} is not allowed for ${type}. Allowed extensions: ${fileType.allowedExtensions.join(", ")}`,
			};
		}

		return { valid: true };
	}

	/**
	 * Generates a safe filename for storage
	 */
	generateSafeFilename(originalname: string, type: UploadType): string {
		const extension = path.extname(originalname).toLowerCase();
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		return `${type}_${timestamp}_${randomSuffix}${extension}`;
	}
}

export const fileValidationService = new FileValidationService();
