// ============================================
// EVENT TYPE DEFINITIONS
// ============================================

import type { TaskStatusType } from "@grandplan/core/types";

export interface DomainEvent<T = unknown> {
	id: string;
	type: string;
	aggregateId: string;
	aggregateType: string;
	payload: T;
	metadata: EventMetadata;
}

export interface EventMetadata {
	userId?: string;
	organizationId?: string;
	workspaceId?: string;
	correlationId?: string;
	timestamp: Date;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
	handle(event: T): Promise<void>;
}

// Task Events
export interface TaskCreatedPayload {
	id: string;
	title: string;
	nodeType: string;
	projectId: string;
	parentId?: string;
	createdById: string;
}

export interface TaskUpdatedPayload {
	taskId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById?: string;
}

export interface TaskStatusChangedPayload {
	taskId: string;
	previousStatus: TaskStatusType;
	newStatus: TaskStatusType;
	reason?: string;
	changedById?: string;
	aiTriggered?: boolean;
}

export interface TaskAssignedPayload {
	taskId: string;
	assigneeId: string;
	previousAssigneeId?: string | null;
	assignedById: string;
}

export interface TaskDecomposedPayload {
	id: string;
	subtaskIds: string[];
	aiDecisionId: string;
}

export interface TaskCompletedPayload {
	id: string;
	completedAt: Date;
}

// Comment Events
export interface CommentCreatedPayload {
	id: string;
	taskId: string;
	authorId?: string;
	content: string;
}

// User/Presence Events
export interface UserMentionedPayload {
	userId: string;
	mentionedById: string;
	resourceType: "task" | "comment";
	resourceId: string;
	preview: string;
}

// Integration Events
export interface IntegrationSyncPayload {
	integrationId: string;
	userId: string;
	direction: "toExternal" | "fromExternal";
	itemsSynced: number;
	errors?: string[];
}

// Notification Events
export interface NotificationCreatedPayload {
	id: string;
	userId: string;
	type: string;
	title: string;
}

// Task move/dependency events
export interface TaskMovedPayload {
	taskId: string;
	previousParentId: string | null;
	newParentId: string | null;
	previousPath: string;
	newPath: string;
	movedById: string;
}

export interface DependencyAddedPayload {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	createdById: string;
}

export interface DependencyRemovedPayload {
	dependencyId: string;
	fromTaskId: string;
	toTaskId: string;
	type: string;
	removedById: string;
}

export interface TaskCommentAddedPayload {
	commentId: string;
	taskId: string;
	authorId: string | null;
	content: string;
}

export interface TaskCommentUpdatedPayload {
	commentId: string;
	taskId: string;
	content: string;
	updatedById: string;
}

export interface TaskCommentDeletedPayload {
	commentId: string;
	taskId: string;
	deletedById: string;
}

export interface ChildrenCompletedPayload {
	parentTaskId: string;
	completedChildIds: string[];
	triggeredById: string;
}

export interface DependencyBlockedPayload {
	blockedTaskId: string;
	blockingTaskId: string;
	dependencyType: string;
}

// Team Events
export interface TeamCreatedPayload {
	teamId: string;
	name: string;
	workspaceId: string;
	organizationId: string;
	createdById: string;
	createdAt: Date;
}

export interface TeamUpdatedPayload {
	teamId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface TeamDeletedPayload {
	teamId: string;
	name: string;
	workspaceId: string;
	organizationId: string;
	deletedById: string;
}

export interface TeamMemberAddedPayload {
	teamId: string;
	userId: string;
	organizationMemberId: string;
	role: string;
	addedById: string;
}

export interface TeamMemberRemovedPayload {
	teamId: string;
	userId: string;
	organizationMemberId: string;
	removedById: string;
}

export interface TeamMemberRoleChangedPayload {
	teamId: string;
	userId: string;
	organizationMemberId: string;
	previousRole: string;
	newRole: string;
	changedById: string;
}

// Workspace Events
export interface WorkspaceCreatedPayload {
	workspaceId: string;
	name: string;
	slug: string;
	organizationId: string;
	ownerId: string;
	createdAt: Date;
}

export interface WorkspaceUpdatedPayload {
	workspaceId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface WorkspaceDeletedPayload {
	workspaceId: string;
	name: string;
	organizationId: string;
	deletedById: string;
}

export interface WorkspaceMemberAddedPayload {
	workspaceId: string;
	userId: string;
	role: string;
	addedById: string;
}

export interface WorkspaceMemberRemovedPayload {
	workspaceId: string;
	userId: string;
	removedById: string;
}

export interface WorkspaceMemberRoleChangedPayload {
	workspaceId: string;
	userId: string;
	previousRole: string;
	newRole: string;
	changedById: string;
}

// Project Events
export interface ProjectCreatedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	createdById: string;
	createdAt: Date;
}

export interface ProjectUpdatedPayload {
	projectId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface ProjectStatusChangedPayload {
	projectId: string;
	previousStatus: string;
	newStatus: string;
	changedById: string;
}

export interface ProjectDeletedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	deletedById: string;
}

export interface ProjectArchivedPayload {
	projectId: string;
	name: string;
	workspaceId: string;
	archivedById: string;
}

// Organization Events
export interface OrganizationCreatedPayload {
	organizationId: string;
	name: string;
	slug: string;
	createdById: string;
	createdAt: Date;
}

export interface OrganizationUpdatedPayload {
	organizationId: string;
	changes: Record<string, unknown>;
	previousValues: Record<string, unknown>;
	updatedById: string;
}

export interface OrganizationStatusChangedPayload {
	organizationId: string;
	previousStatus: string;
	newStatus: string;
	changedById: string;
}

export interface OrganizationBrandingUpdatedPayload {
	organizationId: string;
	changes: Record<string, unknown>;
	previousValues?: Record<string, unknown>;
	updatedById: string;
}

export interface OrganizationDeletedPayload {
	organizationId: string;
	name: string;
	deletedById: string;
}

export interface OrganizationMemberInvitedPayload {
	organizationId: string;
	inviteeEmail: string;
	role: string;
	invitedById: string;
	invitationId: string;
}

export interface OrganizationMemberJoinedPayload {
	organizationId: string;
	userId: string;
	role: string;
	invitationId?: string;
}

export interface OrganizationMemberRemovedPayload {
	organizationId: string;
	userId: string;
	removedById: string;
}

export interface OrganizationMemberRoleChangedPayload {
	organizationId: string;
	userId: string;
	previousRole: string;
	newRole: string;
	changedById: string;
}

// Event type map for type safety
export interface EventTypeMap {
	"task.created": DomainEvent<TaskCreatedPayload>;
	"task.updated": DomainEvent<TaskUpdatedPayload>;
	"task.statusChanged": DomainEvent<TaskStatusChangedPayload>;
	"task.assigned": DomainEvent<TaskAssignedPayload>;
	"task.unassigned": DomainEvent<{
		taskId: string;
		previousAssigneeId: string;
		unassignedById: string;
	}>;
	"task.decomposed": DomainEvent<TaskDecomposedPayload>;
	"task.completed": DomainEvent<TaskCompletedPayload>;
	"task.deleted": DomainEvent<{
		taskId: string;
		title: string;
		projectId: string;
		deletedById: string;
	}>;
	"task.moved": DomainEvent<TaskMovedPayload>;
	"task.dependencyAdded": DomainEvent<DependencyAddedPayload>;
	"task.dependencyRemoved": DomainEvent<DependencyRemovedPayload>;
	"task.commentAdded": DomainEvent<TaskCommentAddedPayload>;
	"task.commentUpdated": DomainEvent<TaskCommentUpdatedPayload>;
	"task.commentDeleted": DomainEvent<TaskCommentDeletedPayload>;
	"task.childrenCompleted": DomainEvent<ChildrenCompletedPayload>;
	"task.dependencyBlocked": DomainEvent<DependencyBlockedPayload>;
	"comment.created": DomainEvent<CommentCreatedPayload>;
	"comment.updated": DomainEvent<{
		id: string;
		taskId: string;
		content: string;
	}>;
	"comment.deleted": DomainEvent<{ id: string; taskId: string }>;
	"user.mentioned": DomainEvent<UserMentionedPayload>;
	"integration.connected": DomainEvent<{
		integrationId: string;
		userId: string;
	}>;
	"integration.disconnected": DomainEvent<{
		integrationId: string;
		userId: string;
	}>;
	"integration.syncCompleted": DomainEvent<IntegrationSyncPayload>;
	"integration.syncFailed": DomainEvent<{
		integrationId: string;
		error: string;
	}>;
	"notification.created": DomainEvent<NotificationCreatedPayload>;
	"notification.read": DomainEvent<{ id: string; userId: string }>;
	"project.created": DomainEvent<ProjectCreatedPayload>;
	"project.updated": DomainEvent<ProjectUpdatedPayload>;
	"project.statusChanged": DomainEvent<ProjectStatusChangedPayload>;
	"project.deleted": DomainEvent<ProjectDeletedPayload>;
	"project.archived": DomainEvent<ProjectArchivedPayload>;
	"team.created": DomainEvent<TeamCreatedPayload>;
	"team.updated": DomainEvent<TeamUpdatedPayload>;
	"team.deleted": DomainEvent<TeamDeletedPayload>;
	"team.memberAdded": DomainEvent<TeamMemberAddedPayload>;
	"team.memberRemoved": DomainEvent<TeamMemberRemovedPayload>;
	"team.memberRoleChanged": DomainEvent<TeamMemberRoleChangedPayload>;
	"workspace.created": DomainEvent<WorkspaceCreatedPayload>;
	"workspace.updated": DomainEvent<WorkspaceUpdatedPayload>;
	"workspace.deleted": DomainEvent<WorkspaceDeletedPayload>;
	"workspace.memberAdded": DomainEvent<WorkspaceMemberAddedPayload>;
	"workspace.memberRemoved": DomainEvent<WorkspaceMemberRemovedPayload>;
	"workspace.memberRoleChanged": DomainEvent<WorkspaceMemberRoleChangedPayload>;
	"organization.created": DomainEvent<OrganizationCreatedPayload>;
	"organization.updated": DomainEvent<OrganizationUpdatedPayload>;
	"organization.statusChanged": DomainEvent<OrganizationStatusChangedPayload>;
	"organization.brandingUpdated": DomainEvent<OrganizationBrandingUpdatedPayload>;
	"organization.deleted": DomainEvent<OrganizationDeletedPayload>;
	"organization.memberInvited": DomainEvent<OrganizationMemberInvitedPayload>;
	"organization.memberJoined": DomainEvent<OrganizationMemberJoinedPayload>;
	"organization.memberRemoved": DomainEvent<OrganizationMemberRemovedPayload>;
	"organization.memberRoleChanged": DomainEvent<OrganizationMemberRoleChangedPayload>;
	"organization.invitationRevoked": DomainEvent<{
		invitationId: string;
		organizationId: string;
		email: string;
		revokedById: string;
	}>;
}

export type EventType = keyof EventTypeMap;
