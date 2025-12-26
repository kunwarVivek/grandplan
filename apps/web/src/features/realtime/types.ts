// ============================================
// REALTIME COLLABORATION TYPES
// ============================================

export type UserPresence = {
	userId: string;
	name: string;
	avatar?: string;
	status: "online" | "away" | "busy";
	currentPage?: string;
	color: string; // Assigned color for cursors
	cursor?: { x: number; y: number; elementId?: string };
	selection?: { start: number; end: number; elementId: string };
};

export type SyncState =
	| "connecting"
	| "syncing"
	| "synced"
	| "disconnected"
	| "error";

export type CursorData = {
	userId: string;
	name: string;
	color: string;
	x: number;
	y: number;
	elementId?: string;
	lastUpdate: number;
};

export type CollaborativeTaskField = {
	fieldName: string;
	editorId: string;
	editorName: string;
	editorColor: string;
	timestamp: number;
};

export type RealtimeNotification = {
	id: string;
	type: string;
	title: string;
	body: string;
	timestamp: number;
};

// Awareness state structure for Yjs
export type AwarenessUser = {
	userId: string;
	name: string;
	avatar?: string;
	color: string;
	cursor?: { x: number; y: number; elementId?: string };
	selection?: { start: number; end: number; elementId: string };
	editingField?: string;
	editingTaskId?: string;
	currentPage?: string;
	status: "online" | "away" | "busy";
};

// Predefined colors for user cursors
export const PRESENCE_COLORS = [
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#14b8a6", // teal
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#84cc16", // lime
] as const;

export function getColorForUser(userId: string): string {
	// Generate a consistent color based on userId hash
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		const char = userId.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	const index = Math.abs(hash) % PRESENCE_COLORS.length;
	return PRESENCE_COLORS[index];
}
