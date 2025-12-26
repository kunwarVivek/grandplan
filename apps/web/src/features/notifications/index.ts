// Types
export type { Notification, NotificationType } from "@/stores/notification-store";

export type {
	NotificationChannel,
	NotificationCategory,
	NotificationPreferences,
	NotificationChannelPreferences,
	NotificationCategoryPreferences,
	QuietHoursSettings,
	DigestFrequency,
	NotificationSummary,
	MarkAsReadInput,
	UpdatePreferencesInput,
	PushSubscription,
	RegisterPushInput,
} from "./types";

export {
	NOTIFICATION_CATEGORY_CONFIG,
	NOTIFICATION_CHANNEL_CONFIG,
} from "./types";

// Hooks
export {
	useNotifications,
	useUnreadCount,
	useNotificationSummary,
	useMarkAsRead,
	useMarkManyAsRead,
	useMarkAllAsRead,
	useArchiveNotification,
	useDeleteNotification,
	useNotificationPreferences,
	useUpdatePreferences,
	usePushSubscriptions,
	useRegisterPush,
	useUnregisterPush,
} from "./hooks/use-notifications";

// Components
export { NotificationBell } from "./components/notification-bell";
export { NotificationList } from "./components/notification-list";
export { NotificationItem } from "./components/notification-item";
export { NotificationPreferences as NotificationPreferencesComponent } from "./components/notification-preferences";
