import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/stores/notification-store";
import type {
	NotificationPreferences,
	NotificationSummary,
	UpdatePreferencesInput,
	MarkAsReadInput,
	PushSubscription,
	RegisterPushInput,
} from "../types";

// Fetch notifications with pagination
export function useNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
	const store = useNotificationStore();

	return useQuery({
		queryKey: [...queryKeys.notifications.all, options],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (options?.limit) params.set("limit", options.limit.toString());
			if (options?.offset) params.set("offset", options.offset.toString());
			if (options?.unreadOnly) params.set("unreadOnly", "true");
			const query = params.toString();

			const result = await api.get<{ notifications: Notification[]; total: number; hasMore: boolean }>(
				`/api/notifications${query ? `?${query}` : ""}`,
				signal
			);

			// Sync with store
			if (!options?.offset) {
				store.setNotifications(result.notifications);
			} else {
				store.appendNotifications(result.notifications);
			}
			store.setHasMore(result.hasMore);

			return result;
		},
	});
}

// Fetch unread count
export function useUnreadCount() {
	const store = useNotificationStore();

	return useQuery({
		queryKey: queryKeys.notifications.unreadCount,
		queryFn: async ({ signal }) => {
			const result = await api.get<{ count: number }>("/api/notifications/unread-count", signal);
			store.setUnreadCount(result.count);
			return result;
		},
		// Poll every minute
		refetchInterval: 60 * 1000,
	});
}

// Fetch notification summary
export function useNotificationSummary() {
	return useQuery({
		queryKey: queryKeys.notifications.summary,
		queryFn: async ({ signal }) => {
			return api.get<NotificationSummary>("/api/notifications/summary", signal);
		},
	});
}

// Mark single notification as read
export function useMarkAsRead() {
	const queryClient = useQueryClient();
	const store = useNotificationStore();

	return useMutation({
		mutationFn: async (notificationId: string) => {
			return api.patch<Notification>(`/api/notifications/${notificationId}/read`);
		},
		onMutate: (notificationId) => {
			// Optimistic update
			store.markAsRead(notificationId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
		onError: () => {
			// Refetch to restore correct state
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
	});
}

// Mark multiple notifications as read
export function useMarkManyAsRead() {
	const queryClient = useQueryClient();
	const store = useNotificationStore();

	return useMutation({
		mutationFn: async (input: MarkAsReadInput) => {
			return api.patch<{ count: number }>("/api/notifications/read", input);
		},
		onMutate: (input) => {
			// Optimistic update
			for (const id of input.notificationIds) {
				store.markAsRead(id);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
		onError: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
	});
}

// Mark all notifications as read
export function useMarkAllAsRead() {
	const queryClient = useQueryClient();
	const store = useNotificationStore();

	return useMutation({
		mutationFn: async () => {
			return api.patch<{ count: number }>("/api/notifications/read-all");
		},
		onMutate: () => {
			store.markAllAsRead();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
		onError: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
	});
}

// Archive notification
export function useArchiveNotification() {
	const queryClient = useQueryClient();
	const store = useNotificationStore();

	return useMutation({
		mutationFn: async (notificationId: string) => {
			return api.patch<Notification>(`/api/notifications/${notificationId}/archive`);
		},
		onMutate: (notificationId) => {
			store.archiveNotification(notificationId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
		},
	});
}

// Delete notification
export function useDeleteNotification() {
	const queryClient = useQueryClient();
	const store = useNotificationStore();

	return useMutation({
		mutationFn: async (notificationId: string) => {
			return api.delete<void>(`/api/notifications/${notificationId}`);
		},
		onMutate: (notificationId) => {
			store.removeNotification(notificationId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
		},
	});
}

// Fetch notification preferences
export function useNotificationPreferences() {
	return useQuery({
		queryKey: queryKeys.notifications.preferences,
		queryFn: async ({ signal }) => {
			return api.get<NotificationPreferences>("/api/notifications/preferences", signal);
		},
	});
}

// Update notification preferences
export function useUpdatePreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdatePreferencesInput) => {
			return api.patch<NotificationPreferences>("/api/notifications/preferences", input);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.notifications.preferences, data);
		},
	});
}

// Fetch push subscriptions
export function usePushSubscriptions() {
	return useQuery({
		queryKey: queryKeys.notifications.pushSubscriptions,
		queryFn: async ({ signal }) => {
			return api.get<{ subscriptions: PushSubscription[] }>(
				"/api/notifications/push/subscriptions",
				signal
			);
		},
	});
}

// Register push subscription
export function useRegisterPush() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: RegisterPushInput) => {
			return api.post<PushSubscription>("/api/notifications/push/subscribe", input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushSubscriptions });
		},
	});
}

// Unregister push subscription
export function useUnregisterPush() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (subscriptionId: string) => {
			return api.delete<void>(`/api/notifications/push/subscriptions/${subscriptionId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushSubscriptions });
		},
	});
}
