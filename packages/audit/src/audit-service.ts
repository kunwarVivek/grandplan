// ============================================
// AUDIT SERVICE
// ============================================

import { db } from "@grandplan/db";
import { tryGetCurrentTenant } from "@grandplan/tenant";
import type { AuditLogEntry, AuditQuery } from "./types.js";

export class AuditService {
	/**
	 * Log an audit event
	 */
	async log(entry: AuditLogEntry): Promise<void> {
		const tenant = tryGetCurrentTenant();

		await db.auditLog.create({
			data: {
				userId: entry.userId ?? tenant?.userId,
				organizationId: entry.organizationId ?? tenant?.organizationId,
				action: entry.action,
				resourceType: entry.resourceType,
				resourceId: entry.resourceId,
				metadata: JSON.parse(JSON.stringify(entry.metadata ?? {})),
				ipAddress: entry.ipAddress,
				userAgent: entry.userAgent,
			},
		});
	}

	/**
	 * Log multiple audit events
	 */
	async logMany(entries: AuditLogEntry[]): Promise<void> {
		const tenant = tryGetCurrentTenant();

		await db.auditLog.createMany({
			data: entries.map((entry) => ({
				userId: entry.userId ?? tenant?.userId,
				organizationId: entry.organizationId ?? tenant?.organizationId,
				action: entry.action,
				resourceType: entry.resourceType,
				resourceId: entry.resourceId,
				metadata: JSON.parse(JSON.stringify(entry.metadata ?? {})),
				ipAddress: entry.ipAddress,
				userAgent: entry.userAgent,
			})),
		});
	}

	/**
	 * Query audit logs
	 */
	async query(params: AuditQuery) {
		const where: Record<string, unknown> = {};

		if (params.organizationId) {
			where.organizationId = params.organizationId;
		}

		if (params.userId) {
			where.userId = params.userId;
		}

		if (params.action) {
			where.action = Array.isArray(params.action)
				? { in: params.action }
				: params.action;
		}

		if (params.resourceType) {
			where.resourceType = params.resourceType;
		}

		if (params.resourceId) {
			where.resourceId = params.resourceId;
		}

		if (params.startDate || params.endDate) {
			where.createdAt = {};
			if (params.startDate) {
				(where.createdAt as Record<string, Date>).gte = params.startDate;
			}
			if (params.endDate) {
				(where.createdAt as Record<string, Date>).lte = params.endDate;
			}
		}

		const [logs, total] = await Promise.all([
			db.auditLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: params.limit ?? 50,
				skip: params.offset ?? 0,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			}),
			db.auditLog.count({ where }),
		]);

		return { logs, total };
	}

	/**
	 * Get recent activity for a resource
	 */
	async getResourceActivity(
		resourceType: string,
		resourceId: string,
		limit = 20,
	) {
		return db.auditLog.findMany({
			where: {
				resourceType,
				resourceId,
			},
			orderBy: { createdAt: "desc" },
			take: limit,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	}

	/**
	 * Get user activity
	 */
	async getUserActivity(userId: string, limit = 50) {
		return db.auditLog.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}

	/**
	 * Clean up old audit logs (for maintenance)
	 */
	async cleanup(olderThanDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		const result = await db.auditLog.deleteMany({
			where: {
				createdAt: {
					lt: cutoffDate,
				},
			},
		});

		return result.count;
	}
}

// Singleton instance
export const auditService = new AuditService();
