// ============================================
// REALTIME TYPE DEFINITIONS
// ============================================

export interface SocketAuthPayload {
	userId: string;
	organizationId: string;
	workspaceId?: string;
	token: string;
}

export interface PresenceData {
	userId: string;
	name: string;
	avatar?: string;
	status: "online" | "away" | "busy";
	currentPage?: string;
	lastActiveAt: Date;
}

export interface CursorPosition {
	userId: string;
	projectId: string;
	x: number;
	y: number;
	elementId?: string;
}

export interface TaskUpdate {
	taskId: string;
	changes: Record<string, unknown>;
	userId: string;
	timestamp: Date;
}

// Socket.io events
export interface ServerToClientEvents {
	// Presence events
	"presence:joined": (user: PresenceData) => void;
	"presence:left": (userId: string) => void;
	"presence:updated": (user: PresenceData) => void;
	"presence:list": (users: PresenceData[]) => void;
	"cursor:moved": (cursor: CursorPosition) => void;

	// Task events
	"task:created": (task: { id: string; data: Record<string, unknown> }) => void;
	"task:updated": (update: TaskUpdate) => void;
	"task:deleted": (taskId: string) => void;
	"task:moved": (data: {
		taskId: string;
		newParentId?: string;
		newIndex: number;
	}) => void;

	// CRDT sync events
	"sync:update": (update: Uint8Array) => void;
	"sync:awareness": (update: Uint8Array) => void;

	// Notification events
	"notification:new": (notification: {
		id: string;
		type: string;
		title: string;
		body: string;
	}) => void;
	"notification:read": (notificationId: string) => void;
	"notification:count": (count: number) => void;

	// Error events
	error: (message: string) => void;
}

export interface ClientToServerEvents {
	// Presence events
	"presence:update": (data: Partial<PresenceData>) => void;
	"cursor:move": (cursor: Omit<CursorPosition, "userId">) => void;

	// Room management
	"room:join": (roomId: string) => void;
	"room:leave": (roomId: string) => void;

	// CRDT sync events
	"sync:update": (update: Uint8Array) => void;
	"sync:awareness": (update: Uint8Array) => void;

	// Notification events
	"notification:markRead": (notificationId: string) => void;
	"notification:markAllRead": () => void;
}

export interface InterServerEvents {
	ping: () => void;
}

export interface SocketData {
	userId: string;
	organizationId: string;
	workspaceId?: string;
	name?: string;
	avatar?: string;
}
