// Auth
export {
	useAuthStore,
	useUser,
	useIsAuthenticated,
	useIsAuthLoading,
} from "./auth-store";
export type { User, Session } from "./auth-store";

// Organization
export {
	useOrganizationStore,
	useActiveOrganization,
	useActiveRole,
	useOrganizations,
	useIsOrgAdmin,
} from "./organization-store";
export type {
	Organization,
	OrganizationMember,
	OrganizationStatus,
	MemberRole,
	BrandingConfig,
} from "./organization-store";

// Workspace
export {
	useWorkspaceStore,
	useActiveWorkspace,
	useActiveWorkspaceRole,
	useWorkspaces,
	useIsWorkspaceAdmin,
} from "./workspace-store";
export type { Workspace, WorkspaceMember, WorkspaceRole } from "./workspace-store";

// UI
export {
	useUIStore,
	useSidebarCollapsed,
	useTheme,
	useActiveModal,
	useModalData,
	useTaskViewMode,
	useTaskDetailState,
} from "./ui-store";
export type { Theme, ModalType, ModalData } from "./ui-store";

// Notifications
export {
	useNotificationStore,
	useNotifications,
	useUnreadCount,
	useUnreadNotifications,
} from "./notification-store";
export type { Notification, NotificationType } from "./notification-store";
