// ============================================
// PRISMA EXTENSION - Auto-filtering for multi-tenancy
// ============================================

import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@grandplan/db";
import { tryGetCurrentTenant } from "./context.js";

// Models that should be automatically filtered by organizationId
export const TENANT_MODELS = [
	"Team",
	"TeamMember",
	"OrganizationMember",
	"OrganizationInvitation",
	"Workspace",
	"WorkspaceMember",
	"Project",
	"TaskNode",
	"TaskDependency",
	"TaskHistory",
	"TaskAIDecision",
	"TaskComment",
	"WorkspaceAIConfig",
	"Subscription",
	"Invoice",
	"UsageRecord",
	"OrganizationFeatureFlag",
	"CustomDomain",
	"EmailTemplate",
	"AuditLog",
	"IntegrationConnection",
	"IntegrationSyncConfig",
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

function isTenantModel(model: string): model is TenantModel {
	return TENANT_MODELS.includes(model as TenantModel);
}

// ============================================
// TENANT FILTER BYPASS
// ============================================

// Storage flag for bypassing tenant filter
const bypassStorage = new AsyncLocalStorage<boolean>();

/**
 * Check if tenant filtering should be bypassed
 */
export function isTenantFilterBypassed(): boolean {
	return bypassStorage.getStore() === true;
}

/**
 * Bypass tenant filtering for specific operations
 * Use with caution - only for platform admin operations
 *
 * @example
 * // Get all organizations (platform admin only)
 * const allOrgs = await bypassTenantFilter(() =>
 *   prisma.organization.findMany()
 * );
 */
export function bypassTenantFilter<T>(fn: () => T): T {
	return bypassStorage.run(true, fn);
}

/**
 * Async version of bypassTenantFilter for async operations
 */
export async function bypassTenantFilterAsync<T>(
	fn: () => Promise<T>,
): Promise<T> {
	return bypassStorage.run(true, fn);
}

// ============================================
// PRISMA EXTENSION
// ============================================

/**
 * Prisma extension for automatic tenant filtering
 * Automatically adds organizationId filter to all queries on tenant-scoped models
 */
export function createTenantExtension() {
	return Prisma.defineExtension({
		name: "tenant-extension",
		query: {
			$allModels: {
				async $allOperations({ model, operation, args, query }) {
					// Check if bypass is enabled (for platform admin operations)
					if (isTenantFilterBypassed()) {
						return query(args);
					}

					const tenant = tryGetCurrentTenant();

					// Skip if no tenant context or not a tenant model
					if (!tenant || !isTenantModel(model)) {
						return query(args);
					}

					const organizationId = tenant.organizationId;

					// Cast args to allow dynamic property access
					const mutableArgs = args as Record<string, unknown>;

					// For read operations, add organizationId to where clause
					if (
						[
							"findUnique",
							"findFirst",
							"findMany",
							"count",
							"aggregate",
							"groupBy",
						].includes(operation)
					) {
						mutableArgs.where = {
							...(mutableArgs.where as Record<string, unknown>),
							organizationId,
						};
					}

					// For update/delete operations, add organizationId to where clause
					if (
						["update", "updateMany", "delete", "deleteMany", "upsert"].includes(
							operation,
						)
					) {
						mutableArgs.where = {
							...(mutableArgs.where as Record<string, unknown>),
							organizationId,
						};
					}

					// For create operations, auto-set organizationId
					if (operation === "create") {
						mutableArgs.data = {
							...(mutableArgs.data as Record<string, unknown>),
							organizationId,
						};
					}

					// For createMany operations, auto-set organizationId on all records
					if (operation === "createMany") {
						const data = mutableArgs.data;
						if (Array.isArray(data)) {
							mutableArgs.data = data.map((item: Record<string, unknown>) => ({
								...item,
								organizationId,
							}));
						}
					}

					return query(args);
				},
			},
		},
	});
}
