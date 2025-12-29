// ============================================
// REALTIME NOTIFICATIONS HOOK
// ============================================

import { useCallback, useEffect, useRef, useState } from "react";

import { useNotificationsSocket } from "@/providers";
import {
	type Notification,
	type NotificationType,
	useNotificationStore,
} from "@/stores";
import type { RealtimeNotification } from "../types";

type UseRealtimeNotificationsOptions = {
	playSound?: boolean;
	showBrowserNotification?: boolean;
	soundUrl?: string;
};

type UseRealtimeNotificationsReturn = {
	newNotification: RealtimeNotification | null;
	unreadCount: number;
	markAsRead: (notificationId: string) => void;
	markAllAsRead: () => void;
	clearNewNotification: () => void;
};

const DEFAULT_NOTIFICATION_SOUND = "/sounds/notification.mp3";

export function useRealtimeNotifications(
	options: UseRealtimeNotificationsOptions = {},
): UseRealtimeNotificationsReturn {
	const {
		playSound = true,
		showBrowserNotification = true,
		soundUrl = DEFAULT_NOTIFICATION_SOUND,
	} = options;

	const socket = useNotificationsSocket();
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const [newNotification, setNewNotification] =
		useState<RealtimeNotification | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);

	// Store actions
	const {
		addNotification,
		markAsRead: storeMarkAsRead,
		markAllAsRead: storeMarkAllAsRead,
		setUnreadCount: storeSetUnreadCount,
	} = useNotificationStore();

	// Initialize audio element
	useEffect(() => {
		if (playSound && typeof window !== "undefined") {
			audioRef.current = new Audio(soundUrl);
			audioRef.current.volume = 0.5;
		}
	}, [playSound, soundUrl]);

	// Play notification sound
	const playNotificationSound = useCallback(() => {
		if (audioRef.current && playSound) {
			audioRef.current.currentTime = 0;
			audioRef.current.play().catch(() => {
				// Ignore autoplay errors
			});
		}
	}, [playSound]);

	// Show browser notification
	const showBrowserNotificationFn = useCallback(
		(notification: RealtimeNotification) => {
			if (!showBrowserNotification) return;
			if (typeof window === "undefined") return;
			if (!("Notification" in window)) return;

			if (Notification.permission === "granted") {
				new Notification(notification.title, {
					body: notification.body,
					icon: "/favicon.ico",
					tag: notification.id,
				});
			} else if (Notification.permission !== "denied") {
				Notification.requestPermission().then((permission) => {
					if (permission === "granted") {
						new Notification(notification.title, {
							body: notification.body,
							icon: "/favicon.ico",
							tag: notification.id,
						});
					}
				});
			}
		},
		[showBrowserNotification],
	);

	// Mark notification as read
	const markAsRead = useCallback(
		(notificationId: string) => {
			if (socket?.connected) {
				socket.emit("notification:markRead", notificationId);
			}
			storeMarkAsRead(notificationId);
		},
		[socket, storeMarkAsRead],
	);

	// Mark all as read
	const markAllAsRead = useCallback(() => {
		if (socket?.connected) {
			socket.emit("notification:markAllRead");
		}
		storeMarkAllAsRead();
		setUnreadCount(0);
	}, [socket, storeMarkAllAsRead]);

	// Clear the new notification state
	const clearNewNotification = useCallback(() => {
		setNewNotification(null);
	}, []);

	// Listen to socket events
	useEffect(() => {
		if (!socket) return;

		const handleNewNotification = (notification: {
			id: string;
			type: string;
			title: string;
			body: string;
		}) => {
			const realtimeNotification: RealtimeNotification = {
				...notification,
				timestamp: Date.now(),
			};

			// Update local state
			setNewNotification(realtimeNotification);
			setUnreadCount((prev) => prev + 1);

			// Add to store
			const storeNotification: Notification = {
				id: notification.id,
				userId: "", // Will be set by the server
				type: notification.type as NotificationType,
				title: notification.title,
				body: notification.body,
				read: false,
				archived: false,
				createdAt: new Date(),
			};
			addNotification(storeNotification);

			// Play sound and show browser notification
			playNotificationSound();
			showBrowserNotificationFn(realtimeNotification);

			// Auto-clear new notification after 5 seconds
			setTimeout(() => {
				setNewNotification((current) =>
					current?.id === notification.id ? null : current,
				);
			}, 5000);
		};

		const handleNotificationRead = (notificationId: string) => {
			storeMarkAsRead(notificationId);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		};

		const handleNotificationCount = (count: number) => {
			setUnreadCount(count);
			storeSetUnreadCount(count);
		};

		socket.on("notification:new", handleNewNotification);
		socket.on("notification:read", handleNotificationRead);
		socket.on("notification:count", handleNotificationCount);

		return () => {
			socket.off("notification:new", handleNewNotification);
			socket.off("notification:read", handleNotificationRead);
			socket.off("notification:count", handleNotificationCount);
		};
	}, [
		socket,
		addNotification,
		playNotificationSound,
		showBrowserNotificationFn,
		storeMarkAsRead,
		storeSetUnreadCount,
	]);

	return {
		newNotification,
		unreadCount,
		markAsRead,
		markAllAsRead,
		clearNewNotification,
	};
}

// Hook for requesting browser notification permission
export function useNotificationPermission() {
	const [permission, setPermission] =
		useState<NotificationPermission>("default");

	useEffect(() => {
		if (typeof window !== "undefined" && "Notification" in window) {
			setPermission(Notification.permission);
		}
	}, []);

	const requestPermission = useCallback(async () => {
		if (typeof window === "undefined" || !("Notification" in window)) {
			return "denied" as NotificationPermission;
		}

		const result = await Notification.requestPermission();
		setPermission(result);
		return result;
	}, []);

	return {
		permission,
		requestPermission,
		isSupported: typeof window !== "undefined" && "Notification" in window,
	};
}

// Hook for notification toast display
export function useNotificationToast() {
	const [toasts, setToasts] = useState<RealtimeNotification[]>([]);

	const addToast = useCallback((notification: RealtimeNotification) => {
		setToasts((prev) => [...prev, notification]);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== notification.id));
		}, 5000);
	}, []);

	const removeToast = useCallback((notificationId: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== notificationId));
	}, []);

	const clearAllToasts = useCallback(() => {
		setToasts([]);
	}, []);

	return {
		toasts,
		addToast,
		removeToast,
		clearAllToasts,
	};
}
