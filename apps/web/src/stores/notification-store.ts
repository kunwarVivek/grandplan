import { create } from "zustand";

export type NotificationType =
	| "TASK_ASSIGNED"
	| "TASK_MENTIONED"
	| "TASK_STATUS_CHANGED"
	| "TASK_COMMENT"
	| "TASK_DUE_SOON"
	| "TASK_OVERDUE"
	| "TASK_COMPLETED"
	| "TASK_BLOCKED"
	| "TASK_DECOMPOSED"
	| "COMMENT_REPLY"
	| "COMMENT_MENTION"
	| "PROJECT_INVITED"
	| "PROJECT_STATUS_CHANGED"
	| "TEAM_INVITED"
	| "TEAM_ROLE_CHANGED"
	| "ORGANIZATION_INVITED"
	| "INTEGRATION_CONNECTED"
	| "INTEGRATION_DISCONNECTED"
	| "INTEGRATION_ERROR"
	| "BILLING_PAYMENT_SUCCESS"
	| "BILLING_PAYMENT_FAILED"
	| "BILLING_SUBSCRIPTION_UPDATED"
	| "BILLING_TRIAL_ENDING"
	| "SYSTEM_ANNOUNCEMENT"
	| "SYSTEM_MAINTENANCE"
	| "SYSTEM_UPDATE"
	| "AI_SUGGESTION";

export type Notification = {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	body: string;
	read: boolean;
	archived: boolean;
	data?: Record<string, unknown>;
	resourceType?: string;
	resourceId?: string;
	createdAt: Date;
};

type NotificationState = {
	// State
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	hasMore: boolean;

	// Actions
	setNotifications: (notifications: Notification[]) => void;
	addNotification: (notification: Notification) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	archiveNotification: (id: string) => void;
	removeNotification: (id: string) => void;
	setUnreadCount: (count: number) => void;
	incrementUnreadCount: () => void;
	decrementUnreadCount: () => void;
	setLoading: (loading: boolean) => void;
	setHasMore: (hasMore: boolean) => void;
	appendNotifications: (notifications: Notification[]) => void;
	clear: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
	// Initial state
	notifications: [],
	unreadCount: 0,
	isLoading: false,
	hasMore: true,

	// Actions
	setNotifications: (notifications) =>
		set({
			notifications,
			unreadCount: notifications.filter((n) => !n.read).length,
		}),

	addNotification: (notification) =>
		set((state) => ({
			notifications: [notification, ...state.notifications],
			unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
		})),

	markAsRead: (id) =>
		set((state) => {
			const notification = state.notifications.find((n) => n.id === id);
			if (!notification || notification.read) return state;

			return {
				notifications: state.notifications.map((n) =>
					n.id === id ? { ...n, read: true } : n,
				),
				unreadCount: Math.max(0, state.unreadCount - 1),
			};
		}),

	markAllAsRead: () =>
		set((state) => ({
			notifications: state.notifications.map((n) => ({ ...n, read: true })),
			unreadCount: 0,
		})),

	archiveNotification: (id) =>
		set((state) => ({
			notifications: state.notifications.map((n) =>
				n.id === id ? { ...n, archived: true } : n,
			),
		})),

	removeNotification: (id) =>
		set((state) => {
			const notification = state.notifications.find((n) => n.id === id);
			return {
				notifications: state.notifications.filter((n) => n.id !== id),
				unreadCount:
					notification && !notification.read
						? Math.max(0, state.unreadCount - 1)
						: state.unreadCount,
			};
		}),

	setUnreadCount: (count) => set({ unreadCount: count }),

	incrementUnreadCount: () =>
		set((state) => ({ unreadCount: state.unreadCount + 1 })),

	decrementUnreadCount: () =>
		set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

	setLoading: (isLoading) => set({ isLoading }),

	setHasMore: (hasMore) => set({ hasMore }),

	appendNotifications: (notifications) =>
		set((state) => ({
			notifications: [...state.notifications, ...notifications],
		})),

	clear: () =>
		set({
			notifications: [],
			unreadCount: 0,
			isLoading: false,
			hasMore: true,
		}),
}));

// Selector hooks
export const useNotifications = () =>
	useNotificationStore((state) => state.notifications);
export const useUnreadCount = () =>
	useNotificationStore((state) => state.unreadCount);
export const useUnreadNotifications = () =>
	useNotificationStore((state) =>
		state.notifications.filter((n) => !n.read && !n.archived),
	);
