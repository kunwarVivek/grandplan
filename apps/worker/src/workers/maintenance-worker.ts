// ============================================
// MAINTENANCE WORKER - Cleanup and housekeeping jobs
// ============================================

import fs from "node:fs/promises";
import path from "node:path";
import { auditService } from "@grandplan/audit";
import { createLogger } from "@grandplan/core";
import { db } from "@grandplan/db";
import {
	type CleanupJobData,
	type JobResult,
	queueManager,
} from "@grandplan/queue";
import type { Job } from "bullmq";
import {
	CleanupJobSchema,
	validateJobPayload,
} from "../schemas/job-schemas.js";

// Create a child logger for maintenance operations
const logger = createLogger({ context: { service: "maintenance-worker" } });

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const USE_S3 = Boolean(S3_BUCKET);

// Storage types for organizing uploads
type StorageType = "avatar" | "logo" | "favicon" | "attachment";

/**
 * Result of orphaned file cleanup operation
 */
interface OrphanedFileCleanupResult {
	filesDeleted: number;
	bytesFreed: number;
	errors: string[];
	skipped: number;
}

/**
 * Represents a file in storage
 */
interface StoredFile {
	path: string;
	filename: string;
	type: StorageType;
	size: number;
	modifiedAt: Date;
}

/**
 * Get all files currently referenced in the database
 */
async function getReferencedFiles(): Promise<Set<string>> {
	const referencedFiles = new Set<string>();

	// Get user avatars (image field contains URL like /uploads/avatar/filename.jpg)
	const usersWithImages = await db.user.findMany({
		where: { image: { not: null } },
		select: { image: true },
	});
	for (const user of usersWithImages) {
		if (user.image) {
			const filename = extractFilenameFromUrl(user.image);
			if (filename) referencedFiles.add(normalizeStorageKey(filename, "avatar"));
		}
	}

	// Get organization logos
	const orgsWithLogos = await db.organization.findMany({
		where: { logo: { not: null } },
		select: { logo: true, brandingConfig: true },
	});
	for (const org of orgsWithLogos) {
		if (org.logo) {
			const filename = extractFilenameFromUrl(org.logo);
			if (filename) referencedFiles.add(normalizeStorageKey(filename, "logo"));
		}
		// Check branding config for logos and favicons
		if (org.brandingConfig && typeof org.brandingConfig === "object") {
			const config = org.brandingConfig as Record<string, unknown>;
			if (config.logo && typeof config.logo === "string") {
				const filename = extractFilenameFromUrl(config.logo);
				if (filename) referencedFiles.add(normalizeStorageKey(filename, "logo"));
			}
			if (config.favicon && typeof config.favicon === "string") {
				const filename = extractFilenameFromUrl(config.favicon);
				if (filename) referencedFiles.add(normalizeStorageKey(filename, "favicon"));
			}
		}
	}

	// Get task attachments (these use storageKey which is the full key)
	const attachments = await db.taskAttachment.findMany({
		where: { deletedAt: null },
		select: { storageKey: true },
	});
	for (const attachment of attachments) {
		referencedFiles.add(attachment.storageKey);
	}

	logger.debug("Retrieved referenced files from database", {
		count: referencedFiles.size,
	});

	return referencedFiles;
}

/**
 * Extract filename from a URL path
 */
function extractFilenameFromUrl(url: string): string | null {
	try {
		// Handle both full URLs and relative paths
		const urlPath = url.startsWith("http") ? new URL(url).pathname : url;
		const parts = urlPath.split("/").filter(Boolean);
		return parts[parts.length - 1] || null;
	} catch {
		return null;
	}
}

/**
 * Normalize a filename to a storage key format
 */
function normalizeStorageKey(filename: string, type: StorageType): string {
	return `${type}/${filename}`;
}

/**
 * Get all files from local storage
 */
async function getLocalStorageFiles(baseDir: string): Promise<StoredFile[]> {
	const files: StoredFile[] = [];
	const storageTypes: StorageType[] = ["avatar", "logo", "favicon", "attachment"];

	for (const type of storageTypes) {
		const typeDir = path.join(baseDir, type);
		try {
			const entries = await fs.readdir(typeDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isFile()) {
					const filePath = path.join(typeDir, entry.name);
					try {
						const stats = await fs.stat(filePath);
						files.push({
							path: filePath,
							filename: entry.name,
							type,
							size: stats.size,
							modifiedAt: stats.mtime,
						});
					} catch (statError) {
						logger.warn("Failed to stat file", {
							file: filePath,
							error: statError instanceof Error ? statError.message : "Unknown error",
						});
					}
				}
			}
		} catch (error) {
			// Directory may not exist yet, which is fine
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				logger.warn("Failed to read directory", {
					directory: typeDir,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	}

	return files;
}

/**
 * Delete a file from local storage
 */
async function deleteLocalFile(filePath: string): Promise<boolean> {
	try {
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		logger.error("Failed to delete local file", error instanceof Error ? error : null, {
			file: filePath,
		});
		return false;
	}
}

/**
 * Delete a file from S3 storage
 * Note: This is a placeholder - actual S3 implementation would require @aws-sdk/client-s3
 */
async function deleteS3File(key: string): Promise<boolean> {
	// S3 deletion would be implemented here when S3 support is added
	// For now, log and return false to indicate S3 is not configured
	logger.warn("S3 deletion not implemented", { key, bucket: S3_BUCKET, region: S3_REGION });
	return false;
}

/**
 * Clean up orphaned files from storage
 */
async function cleanupOrphanedFiles(
	olderThanDays: number,
): Promise<OrphanedFileCleanupResult> {
	const result: OrphanedFileCleanupResult = {
		filesDeleted: 0,
		bytesFreed: 0,
		errors: [],
		skipped: 0,
	};

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

	logger.info("Starting orphaned files cleanup", {
		olderThanDays,
		cutoffDate: cutoffDate.toISOString(),
		useS3: USE_S3,
	});

	try {
		// Get all files currently referenced in the database
		const referencedFiles = await getReferencedFiles();

		if (USE_S3) {
			// S3 cleanup would be implemented here
			// This would involve listing objects in the S3 bucket and comparing
			// against referenced files, then deleting orphaned ones
			logger.info("S3 orphaned file cleanup not yet implemented - skipping S3 storage");
			result.errors.push("S3 cleanup not implemented");
		} else {
			// Local file storage cleanup
			const baseDir = path.resolve(process.cwd(), UPLOAD_DIR);
			const storedFiles = await getLocalStorageFiles(baseDir);

			logger.info("Found files in local storage", {
				totalFiles: storedFiles.length,
				referencedFiles: referencedFiles.size,
			});

			for (const file of storedFiles) {
				const storageKey = normalizeStorageKey(file.filename, file.type);

				// Check if file is referenced
				if (referencedFiles.has(storageKey)) {
					logger.debug("File is referenced, keeping", { storageKey });
					continue;
				}

				// Check if file is old enough to delete
				if (file.modifiedAt > cutoffDate) {
					logger.debug("File is too recent, skipping", {
						storageKey,
						modifiedAt: file.modifiedAt.toISOString(),
						cutoffDate: cutoffDate.toISOString(),
					});
					result.skipped++;
					continue;
				}

				// File is orphaned and old enough - delete it
				logger.info("Deleting orphaned file", {
					storageKey,
					size: file.size,
					modifiedAt: file.modifiedAt.toISOString(),
				});

				const deleted = await deleteLocalFile(file.path);
				if (deleted) {
					result.filesDeleted++;
					result.bytesFreed += file.size;
				} else {
					result.errors.push(`Failed to delete: ${file.path}`);
				}
			}
		}

		// Also clean up soft-deleted task attachments that are past retention
		const softDeletedAttachments = await db.taskAttachment.findMany({
			where: {
				deletedAt: { lt: cutoffDate },
			},
			select: { id: true, storageKey: true, fileSize: true },
		});

		if (softDeletedAttachments.length > 0) {
			logger.info("Cleaning up soft-deleted attachments", {
				count: softDeletedAttachments.length,
			});

			for (const attachment of softDeletedAttachments) {
				// Delete the actual file
				let fileDeleted = false;
				if (USE_S3) {
					fileDeleted = await deleteS3File(attachment.storageKey);
				} else {
					const filePath = path.join(
						path.resolve(process.cwd(), UPLOAD_DIR),
						attachment.storageKey,
					);
					fileDeleted = await deleteLocalFile(filePath);
				}

				if (fileDeleted) {
					result.filesDeleted++;
					result.bytesFreed += attachment.fileSize;
				}

				// Hard delete the database record
				try {
					await db.taskAttachment.delete({
						where: { id: attachment.id },
					});
				} catch (dbError) {
					result.errors.push(
						`Failed to delete attachment record ${attachment.id}: ${
							dbError instanceof Error ? dbError.message : "Unknown error"
						}`,
					);
				}
			}
		}

		logger.info("Orphaned files cleanup completed", {
			filesDeleted: result.filesDeleted,
			bytesFreed: result.bytesFreed,
			bytesFreedMB: (result.bytesFreed / (1024 * 1024)).toFixed(2),
			errors: result.errors.length,
			skipped: result.skipped,
		});

		return result;
	} catch (error) {
		logger.error("Orphaned files cleanup failed", error instanceof Error ? error : null);
		result.errors.push(error instanceof Error ? error.message : "Unknown error");
		return result;
	}
}

export function registerMaintenanceWorker(): void {
	queueManager.registerWorker<CleanupJobData, JobResult>(
		"maintenance",
		async (job: Job<CleanupJobData>): Promise<JobResult> => {
			// Validate job payload with Zod schema
			const validatedData = validateJobPayload(
				CleanupJobSchema,
				job.data,
				job.id,
				"maintenance"
			);

			const { jobType, olderThanDays } = validatedData;

			logger.info("Running maintenance job", {
				jobType,
				olderThanDays,
				jobId: job.id,
			});

			try {
				let deletedCount = 0;
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

				switch (jobType) {
					case "oldNotifications": {
						const notifResult = await db.notification.deleteMany({
							where: {
								read: true,
								createdAt: { lt: cutoffDate },
							},
						});
						deletedCount = notifResult.count;
						break;
					}

					case "expiredSessions": {
						const sessionResult = await db.session.deleteMany({
							where: {
								expiresAt: { lt: new Date() },
							},
						});
						deletedCount = sessionResult.count;
						break;
					}

					case "orphanedFiles": {
						const cleanupResult = await cleanupOrphanedFiles(olderThanDays);
						deletedCount = cleanupResult.filesDeleted;

						logger.info("Orphaned files maintenance completed", {
							filesDeleted: cleanupResult.filesDeleted,
							bytesFreed: cleanupResult.bytesFreed,
							bytesFreedMB: (cleanupResult.bytesFreed / (1024 * 1024)).toFixed(2),
							errors: cleanupResult.errors,
							skipped: cleanupResult.skipped,
						});

						if (cleanupResult.errors.length > 0) {
							return {
								success: true,
								message: `Cleaned up ${cleanupResult.filesDeleted} orphaned files (${(cleanupResult.bytesFreed / (1024 * 1024)).toFixed(2)} MB) with ${cleanupResult.errors.length} errors`,
								data: {
									deletedCount: cleanupResult.filesDeleted,
									bytesFreed: cleanupResult.bytesFreed,
									errors: cleanupResult.errors,
									skipped: cleanupResult.skipped,
								},
							};
						}

						return {
							success: true,
							message: `Cleaned up ${cleanupResult.filesDeleted} orphaned files (${(cleanupResult.bytesFreed / (1024 * 1024)).toFixed(2)} MB freed)`,
							data: {
								deletedCount: cleanupResult.filesDeleted,
								bytesFreed: cleanupResult.bytesFreed,
								skipped: cleanupResult.skipped,
							},
						};
					}

					case "auditLogs":
						deletedCount = await auditService.cleanup(olderThanDays);
						break;

					default:
						return { success: false, error: `Unknown job type: ${jobType}` };
				}

				logger.info("Maintenance job completed", {
					jobType,
					deletedCount,
					jobId: job.id,
				});

				return {
					success: true,
					message: `Cleaned up ${deletedCount} ${jobType}`,
					data: { deletedCount },
				};
			} catch (error) {
				logger.error("Maintenance job failed", error instanceof Error ? error : null, {
					jobType,
					jobId: job.id,
				});
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			concurrency: 1, // Run one at a time
		},
	);

	logger.info("Maintenance worker registered");
}
