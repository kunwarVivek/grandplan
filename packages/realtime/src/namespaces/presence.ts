// ============================================
// PRESENCE NAMESPACE - User presence tracking
// ============================================

import type { Namespace } from "socket.io";
import type {
	ClientToServerEvents,
	PresenceData,
	ServerToClientEvents,
	SocketData,
} from "../types.js";

// In-memory presence store (use Redis in production)
const presenceStore = new Map<string, Map<string, PresenceData>>();

function getOrganizationPresence(
	organizationId: string,
): Map<string, PresenceData> {
	let orgPresence = presenceStore.get(organizationId);
	if (!orgPresence) {
		orgPresence = new Map();
		presenceStore.set(organizationId, orgPresence);
	}
	return orgPresence;
}

export function setupPresenceNamespace(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
): void {
	namespace.on("connection", (socket) => {
		const { userId, organizationId, name, avatar } = socket.data;
		const orgPresence = getOrganizationPresence(organizationId);

		// Set initial presence
		const presenceData: PresenceData = {
			userId,
			name: name ?? "Unknown",
			avatar,
			status: "online",
			lastActiveAt: new Date(),
		};

		orgPresence.set(userId, presenceData);

		// Join organization presence room
		socket.join(`presence:${organizationId}`);
		socket.join(`user:${userId}`);

		// Notify others of new presence
		socket
			.to(`presence:${organizationId}`)
			.emit("presence:joined", presenceData);

		// Send current presence list to new connection
		socket.emit("presence:list", Array.from(orgPresence.values()));

		// Handle presence updates
		socket.on("presence:update", (update) => {
			const current = orgPresence.get(userId);
			if (current) {
				const updated: PresenceData = {
					...current,
					...update,
					lastActiveAt: new Date(),
				};
				orgPresence.set(userId, updated);

				// Broadcast update
				namespace
					.to(`presence:${organizationId}`)
					.emit("presence:updated", updated);
			}
		});

		// Handle disconnect
		socket.on("disconnect", () => {
			// Check if user has other connections
			const userSockets = namespace.sockets;
			let hasOtherConnections = false;

			for (const [, s] of userSockets) {
				if (s.data.userId === userId && s.id !== socket.id) {
					hasOtherConnections = true;
					break;
				}
			}

			if (!hasOtherConnections) {
				orgPresence.delete(userId);
				socket.to(`presence:${organizationId}`).emit("presence:left", userId);
			}
		});

		// Heartbeat to track activity
		const heartbeatInterval = setInterval(() => {
			const current = orgPresence.get(userId);
			if (current) {
				current.lastActiveAt = new Date();
			}
		}, 30000); // Every 30 seconds

		socket.on("disconnect", () => {
			clearInterval(heartbeatInterval);
		});
	});

	// Cleanup inactive users periodically
	setInterval(() => {
		const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
		const now = Date.now();

		for (const [orgId, orgPresence] of presenceStore) {
			for (const [odId, presence] of orgPresence) {
				if (now - presence.lastActiveAt.getTime() > inactiveThreshold) {
					orgPresence.delete(presence.userId);
					namespace
						.to(`presence:${orgId}`)
						.emit("presence:left", presence.userId);
				}
			}
		}
	}, 60000); // Every minute
}
