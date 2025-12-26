// ============================================
// REALTIME COLLABORATION FEATURE
// ============================================

// Types
export type {
	UserPresence,
	SyncState,
	CursorData,
	CollaborativeTaskField,
	RealtimeNotification,
	AwarenessUser,
} from "./types";
export { PRESENCE_COLORS, getColorForUser } from "./types";

// Hooks
export {
	useYjsDocument,
	useYjsMap,
	useYjsArray,
	usePresence,
	useCursorTracking,
	useUserPresence,
	useCollaborativeTask,
	useOptimisticTaskUpdate,
	useCollaborativeText,
	useRealtimeNotifications,
	useNotificationPermission,
	useNotificationToast,
} from "./hooks";

// Components
export {
	PresenceAvatars,
	PresenceIndicator,
	PresenceList,
	CursorOverlay,
	ElementCursor,
	SelectionHighlight,
	FieldEditingIndicator,
} from "./components";
