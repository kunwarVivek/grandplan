// ============================================
// AUDIT TYPE DEFINITIONS
// ============================================

export type AuditAction =
	// Organization actions
	| "organization.created"
	| "organization.updated"
	| "organization.deleted"
	| "organization.branding_updated"
	// Member actions
	| "member.invited"
	| "member.joined"
	| "member.removed"
	| "member.role_changed"
	// Team actions
	| "team.created"
	| "team.updated"
	| "team.deleted"
	| "team.member_added"
	| "team.member_removed"
	// Workspace actions
	| "workspace.created"
	| "workspace.updated"
	| "workspace.deleted"
	| "workspace.member_added"
	| "workspace.member_removed"
	// Project actions
	| "project.created"
	| "project.updated"
	| "project.deleted"
	| "project.archived"
	// Task actions
	| "task.created"
	| "task.updated"
	| "task.deleted"
	| "task.status_changed"
	| "task.assigned"
	| "task.unassigned"
	| "task.decomposed"
	// AI actions
	| "ai.decomposition_requested"
	| "ai.decomposition_applied"
	| "ai.suggestion_applied"
	| "ai.config_updated"
	// Billing actions
	| "subscription.created"
	| "subscription.updated"
	| "subscription.cancelled"
	| "payment.succeeded"
	| "payment.failed"
	// Integration actions
	| "integration.connected"
	| "integration.disconnected"
	| "integration.sync_started"
	| "integration.sync_completed"
	// Security actions
	| "auth.login"
	| "auth.logout"
	| "auth.password_changed"
	| "auth.mfa_enabled"
	| "auth.mfa_disabled"
	| "auth.api_key_created"
	| "auth.api_key_revoked";

export type AuditResourceType =
	| "organization"
	| "team"
	| "user"
	| "workspace"
	| "project"
	| "task"
	| "subscription"
	| "integration"
	| "api_key";

export interface AuditLogEntry {
	userId?: string;
	organizationId?: string;
	action: AuditAction;
	resourceType: AuditResourceType;
	resourceId: string;
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

export interface AuditQuery {
	organizationId?: string;
	userId?: string;
	action?: AuditAction | AuditAction[];
	resourceType?: AuditResourceType;
	resourceId?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}
