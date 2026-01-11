// ============================================
// NOTIFICATIONS NAMESPACE - Real-time notifications
// ============================================

import { createLogger } from "@grandplan/core";
import type { Namespace } from "socket.io";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	SocketData,
} from "../types.js";

const logger = createLogger({ context: { service: 'realtime', namespace: 'notifications' } });

export function setupNotificationsNamespace(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
): void {
	namespace.on("connection", (socket) => {
		const { userId, organizationId } = socket.data;

		// Join user-specific notification room
		socket.join(`notifications:${userId}`);
		socket.join(`org-notifications:${organizationId}`);

		logger.info("User connected to notifications", { userId });

		// Handle marking notification as read
		socket.on("notification:markRead", async (notificationId) => {
			// This would typically call the notification service
			// For now, just acknowledge
			socket.emit("notification:read", notificationId);
		});

		// Handle marking all as read
		socket.on("notification:markAllRead", async () => {
			// This would typically call the notification service
			socket.emit("notification:count", 0);
		});

		socket.on("disconnect", () => {
			logger.info("User disconnected from notifications", { userId });
		});
	});
}

/**
 * Helper to send notification to a specific user
 */
export function sendNotificationToUser(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
	userId: string,
	notification: { id: string; type: string; title: string; body: string },
): void {
	namespace
		.to(`notifications:${userId}`)
		.emit("notification:new", notification);
}

/**
 * Helper to send notification to all users in an organization
 */
export function sendNotificationToOrganization(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
	organizationId: string,
	notification: { id: string; type: string; title: string; body: string },
): void {
	namespace
		.to(`org-notifications:${organizationId}`)
		.emit("notification:new", notification);
}

/**
 * Helper to update notification count for a user
 */
export function updateNotificationCount(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
	userId: string,
	count: number,
): void {
	namespace.to(`notifications:${userId}`).emit("notification:count", count);
}
