// ============================================
// PRISMA EXTENSION - Auto-filtering for multi-tenancy
// ============================================

import { Prisma } from "@prisma/client";
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
					const tenant = tryGetCurrentTenant();

					// Skip if no tenant context or not a tenant model
					if (!tenant || !isTenantModel(model)) {
						return query(args);
					}

					const organizationId = tenant.organizationId;

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
						args.where = {
							...args.where,
							organizationId,
						};
					}

					// For update/delete operations, add organizationId to where clause
					if (
						["update", "updateMany", "delete", "deleteMany", "upsert"].includes(
							operation,
						)
					) {
						args.where = {
							...args.where,
							organizationId,
						};
					}

					// For create operations, auto-set organizationId
					if (operation === "create") {
						args.data = {
							...args.data,
							organizationId,
						};
					}

					// For createMany operations, auto-set organizationId on all records
					if (operation === "createMany") {
						if (Array.isArray(args.data)) {
							args.data = args.data.map((item: Record<string, unknown>) => ({
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

/**
 * Bypass tenant filtering for specific operations
 * Use with caution - only for platform admin operations
 */
export function bypassTenantFilter<T>(fn: () => T): T {
	// This removes the tenant context for the duration of the function
	// Implementation would require a separate storage flag
	return fn();
}
