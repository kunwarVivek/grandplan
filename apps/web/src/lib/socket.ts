import { env } from "@grandplan/env/web";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
	if (!socket) {
		socket = io(env.VITE_SERVER_URL, {
			autoConnect: false,
			withCredentials: true,
			transports: ["websocket", "polling"],
		});
	}
	return socket;
}

export function connectSocket(token?: string): Socket {
	const s = getSocket();

	if (token) {
		s.auth = { token };
	}

	if (!s.connected) {
		s.connect();
	}

	return s;
}

export function disconnectSocket(): void {
	if (socket?.connected) {
		socket.disconnect();
	}
}

// Namespace-specific connections
export function getTasksSocket(): Socket {
	return io(`${env.VITE_SERVER_URL}/tasks`, {
		autoConnect: false,
		withCredentials: true,
		transports: ["websocket", "polling"],
	});
}

export function getNotificationsSocket(): Socket {
	return io(`${env.VITE_SERVER_URL}/notifications`, {
		autoConnect: false,
		withCredentials: true,
		transports: ["websocket", "polling"],
	});
}

export function getPresenceSocket(): Socket {
	return io(`${env.VITE_SERVER_URL}/presence`, {
		autoConnect: false,
		withCredentials: true,
		transports: ["websocket", "polling"],
	});
}

// Socket event types
export type TaskSocketEvents = {
	// Client -> Server
	"task:subscribe": (projectId: string) => void;
	"task:unsubscribe": (projectId: string) => void;
	"task:update": (data: {
		taskId: string;
		changes: Record<string, unknown>;
	}) => void;

	// Server -> Client
	"task:created": (task: unknown) => void;
	"task:updated": (data: {
		taskId: string;
		changes: Record<string, unknown>;
	}) => void;
	"task:deleted": (taskId: string) => void;
	"task:moved": (data: {
		taskId: string;
		newParentId: string | null;
		newPosition: number;
	}) => void;
};

export type NotificationSocketEvents = {
	// Server -> Client
	"notification:new": (notification: unknown) => void;
	"notification:read": (notificationId: string) => void;
	"notification:count": (count: number) => void;
};

export type PresenceSocketEvents = {
	// Client -> Server
	"presence:join": (data: { workspaceId: string; projectId?: string }) => void;
	"presence:leave": (data: { workspaceId: string; projectId?: string }) => void;
	"presence:cursor": (data: {
		x: number;
		y: number;
		elementId?: string;
	}) => void;

	// Server -> Client
	"presence:users": (
		users: Array<{ userId: string; name: string; avatar?: string }>,
	) => void;
	"presence:user_joined": (user: {
		userId: string;
		name: string;
		avatar?: string;
	}) => void;
	"presence:user_left": (userId: string) => void;
	"presence:cursors": (
		cursors: Record<string, { x: number; y: number; elementId?: string }>,
	) => void;
};
