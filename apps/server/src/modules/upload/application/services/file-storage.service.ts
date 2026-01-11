// ============================================
// FILE STORAGE SERVICE
// Handles file storage operations (local for MVP)
// ============================================

import fs from "node:fs/promises";
import path from "node:path";
import type { UploadType } from "../../domain/value-objects/file-type.vo.js";

// Storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PUBLIC_URL_BASE = process.env.UPLOAD_PUBLIC_URL || "/uploads";

interface StorageResult {
	success: boolean;
	url?: string;
	path?: string;
	error?: string;
}

class FileStorageService {
	private baseDir: string;

	constructor() {
		// Resolve upload directory relative to server root
		this.baseDir = path.resolve(process.cwd(), UPLOAD_DIR);
	}

	/**
	 * Ensures the upload directory structure exists
	 */
	private async ensureDirectoryExists(type: UploadType): Promise<string> {
		const typeDir = path.join(this.baseDir, type);
		await fs.mkdir(typeDir, { recursive: true });
		return typeDir;
	}

	/**
	 * Stores a file to the local filesystem
	 */
	async store(
		buffer: Buffer,
		filename: string,
		type: UploadType,
	): Promise<StorageResult> {
		try {
			const typeDir = await this.ensureDirectoryExists(type);
			const filePath = path.join(typeDir, filename);

			await fs.writeFile(filePath, buffer);

			// Generate public URL
			const publicUrl = `${PUBLIC_URL_BASE}/${type}/${filename}`;

			return {
				success: true,
				url: publicUrl,
				path: filePath,
			};
		} catch (error) {
			console.error("File storage error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to store file",
			};
		}
	}

	/**
	 * Deletes a file from storage
	 */
	async delete(type: UploadType, filename: string): Promise<boolean> {
		try {
			const filePath = path.join(this.baseDir, type, filename);
			await fs.unlink(filePath);
			return true;
		} catch (error) {
			console.error("File deletion error:", error);
			return false;
		}
	}

	/**
	 * Checks if a file exists
	 */
	async exists(type: UploadType, filename: string): Promise<boolean> {
		try {
			const filePath = path.join(this.baseDir, type, filename);
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Gets the base directory for uploads
	 */
	getBaseDir(): string {
		return this.baseDir;
	}
}

export const fileStorageService = new FileStorageService();
