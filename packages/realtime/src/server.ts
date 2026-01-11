// ============================================
// REALTIME SERVER - Socket.io setup
// ============================================

import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { Server as SocketServer } from "socket.io";
import { logger } from "@grandplan/core";
import { setupNotificationsNamespace } from "./namespaces/notifications.js";
import { setupPresenceNamespace } from "./namespaces/presence.js";
import { setupTasksNamespace } from "./namespaces/tasks.js";
import type {
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "./types.js";

export class RealtimeServer {
	private io: SocketServer<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	> | null = null;

	async initialize(
		httpServer: HttpServer,
		config: {
			redisUrl: string;
			corsOrigin: string | string[];
			authHandler: (token: string) => Promise<{
				userId: string;
				organizationId: string;
				workspaceId?: string;
				name?: string;
				avatar?: string;
			} | null>;
		},
	): Promise<void> {
		// Create Socket.io server
		this.io = new SocketServer<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>(httpServer, {
			cors: {
				origin: config.corsOrigin,
				methods: ["GET", "POST"],
				credentials: true,
			},
			transports: ["websocket", "polling"],
		});

		// Setup Redis adapter for horizontal scaling
		const pubClient = new Redis(config.redisUrl);
		const subClient = pubClient.duplicate();
		this.io.adapter(createAdapter(pubClient, subClient));

		// Authentication middleware
		this.io.use(async (socket, next) => {
			try {
				const token = socket.handshake.auth.token as string;
				if (!token) {
					return next(new Error("Authentication required"));
				}

				const user = await config.authHandler(token);
				if (!user) {
					return next(new Error("Invalid token"));
				}

				socket.data.userId = user.userId;
				socket.data.organizationId = user.organizationId;
				socket.data.workspaceId = user.workspaceId;
				socket.data.name = user.name;
				socket.data.avatar = user.avatar;

				next();
			} catch (error) {
				next(new Error("Authentication failed"));
			}
		});

		// Setup namespaces
		setupTasksNamespace(this.io.of("/tasks"));
		setupPresenceNamespace(this.io.of("/presence"));
		setupNotificationsNamespace(this.io.of("/notifications"));

		// Default namespace connection handling
		this.io.on("connection", (socket) => {
			logger.info("Client connected", {
				socketId: socket.id,
				userId: socket.data.userId,
			});

			// Join organization room
			socket.join(`org:${socket.data.organizationId}`);

			// Join workspace room if applicable
			if (socket.data.workspaceId) {
				socket.join(`workspace:${socket.data.workspaceId}`);
			}

			socket.on("disconnect", (reason) => {
				logger.info("Client disconnected", {
					socketId: socket.id,
					reason,
				});
			});
		});

		logger.info("Realtime server initialized");
	}

	getIO() {
		if (!this.io) {
			throw new Error("Realtime server not initialized");
		}
		return this.io;
	}

	/**
	 * Emit to all users in an organization
	 */
	emitToOrganization<K extends keyof ServerToClientEvents>(
		organizationId: string,
		event: K,
		...args: Parameters<ServerToClientEvents[K]>
	): void {
		this.io?.to(`org:${organizationId}`).emit(event, ...args);
	}

	/**
	 * Emit to all users in a workspace
	 */
	emitToWorkspace<K extends keyof ServerToClientEvents>(
		workspaceId: string,
		event: K,
		...args: Parameters<ServerToClientEvents[K]>
	): void {
		this.io?.to(`workspace:${workspaceId}`).emit(event, ...args);
	}

	/**
	 * Emit to a specific user
	 */
	emitToUser<K extends keyof ServerToClientEvents>(
		userId: string,
		event: K,
		...args: Parameters<ServerToClientEvents[K]>
	): void {
		this.io?.to(`user:${userId}`).emit(event, ...args);
	}

	/**
	 * Emit to a project room
	 */
	emitToProject<K extends keyof ServerToClientEvents>(
		projectId: string,
		event: K,
		...args: Parameters<ServerToClientEvents[K]>
	): void {
		this.io
			?.of("/tasks")
			.to(`project:${projectId}`)
			.emit(event, ...args);
	}

	async shutdown(): Promise<void> {
		if (this.io) {
			await new Promise<void>((resolve) => {
				this.io!.close(() => resolve());
			});
			this.io = null;
		}
	}
}

// Singleton instance
export const realtimeServer = new RealtimeServer();
