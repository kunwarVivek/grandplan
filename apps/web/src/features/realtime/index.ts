// ============================================
// REALTIME COLLABORATION FEATURE
// ============================================

// Components
export {
	CursorOverlay,
	ElementCursor,
	FieldEditingIndicator,
	PresenceAvatars,
	PresenceIndicator,
	PresenceList,
	SelectionHighlight,
} from "./components";
// Hooks
export {
	useCollaborativeTask,
	useCollaborativeText,
	useCursorTracking,
	useNotificationPermission,
	useNotificationToast,
	useOptimisticTaskUpdate,
	usePresence,
	useRealtimeNotifications,
	useUserPresence,
	useYjsArray,
	useYjsDocument,
	useYjsMap,
} from "./hooks";
// Types
export type {
	AwarenessUser,
	CollaborativeTaskField,
	CursorData,
	RealtimeNotification,
	SyncState,
	UserPresence,
} from "./types";
export { getColorForUser, PRESENCE_COLORS } from "./types";
