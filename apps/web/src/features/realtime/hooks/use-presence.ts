// ============================================
// USER PRESENCE HOOK
// ============================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Awareness } from "y-protocols/awareness";

import { usePresenceSocket } from "@/providers";
import type { AwarenessUser, CursorData, UserPresence } from "../types";
import { getColorForUser } from "../types";

type PresenceData = {
	userId: string;
	name: string;
	avatar?: string;
	status: "online" | "away" | "busy";
	currentPage?: string;
	lastActiveAt: Date;
};

type UsePresenceOptions = {
	awareness?: Awareness | null;
	currentPage?: string;
};

type UsePresenceReturn = {
	users: UserPresence[];
	cursors: CursorData[];
	updateCursor: (x: number, y: number, elementId?: string) => void;
	updateStatus: (status: "online" | "away" | "busy") => void;
	updateCurrentPage: (page: string) => void;
	isUserOnline: (userId: string) => boolean;
};

export function usePresence(
	_projectId: string | null,
	options: UsePresenceOptions = {},
): UsePresenceReturn {
	const { awareness, currentPage } = options;
	const socket = usePresenceSocket();

	const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceData>>(
		new Map(),
	);
	const [awarenessUsers, setAwarenessUsers] = useState<
		Map<number, AwarenessUser>
	>(new Map());

	// Combine presence and awareness data
	const users = useMemo((): UserPresence[] => {
		const combined = new Map<string, UserPresence>();

		// Add users from socket presence
		for (const [userId, data] of presenceUsers) {
			combined.set(userId, {
				userId: data.userId,
				name: data.name,
				avatar: data.avatar,
				status: data.status,
				currentPage: data.currentPage,
				color: getColorForUser(data.userId),
			});
		}

		// Merge awareness data (cursors, selections)
		for (const [, data] of awarenessUsers) {
			if (!data?.userId) continue;

			const existing = combined.get(data.userId);
			if (existing) {
				combined.set(data.userId, {
					...existing,
					cursor: data.cursor,
					selection: data.selection,
					status: data.status || existing.status,
				});
			} else {
				combined.set(data.userId, {
					userId: data.userId,
					name: data.name,
					avatar: data.avatar,
					status: data.status || "online",
					color: data.color || getColorForUser(data.userId),
					cursor: data.cursor,
					selection: data.selection,
				});
			}
		}

		return Array.from(combined.values());
	}, [presenceUsers, awarenessUsers]);

	// Extract cursor data from users
	const cursors = useMemo((): CursorData[] => {
		return users
			.filter((user) => user.cursor)
			.map((user) => ({
				userId: user.userId,
				name: user.name,
				color: user.color,
				x: user.cursor!.x,
				y: user.cursor!.y,
				elementId: user.cursor!.elementId,
				lastUpdate: Date.now(),
			}));
	}, [users]);

	// Update cursor position
	const updateCursor = useCallback(
		(x: number, y: number, elementId?: string) => {
			if (!awareness) return;

			const localState = awareness.getLocalState();
			awareness.setLocalStateField("user", {
				...localState?.user,
				cursor: { x, y, elementId },
			});
		},
		[awareness],
	);

	// Update user status
	const updateStatus = useCallback(
		(status: "online" | "away" | "busy") => {
			if (awareness) {
				const localState = awareness.getLocalState();
				awareness.setLocalStateField("user", {
					...localState?.user,
					status,
				});
			}

			if (socket?.connected) {
				socket.emit("presence:update", { status });
			}
		},
		[awareness, socket],
	);

	// Update current page
	const updateCurrentPage = useCallback(
		(page: string) => {
			if (awareness) {
				const localState = awareness.getLocalState();
				awareness.setLocalStateField("user", {
					...localState?.user,
					currentPage: page,
				});
			}

			if (socket?.connected) {
				socket.emit("presence:update", { currentPage: page });
			}
		},
		[awareness, socket],
	);

	// Check if user is online
	const isUserOnline = useCallback(
		(userId: string): boolean => {
			return users.some((u) => u.userId === userId && u.status === "online");
		},
		[users],
	);

	// Listen to socket presence events
	useEffect(() => {
		if (!socket) return;

		const handlePresenceList = (list: PresenceData[]) => {
			const newMap = new Map<string, PresenceData>();
			for (const user of list) {
				newMap.set(user.userId, user);
			}
			setPresenceUsers(newMap);
		};

		const handlePresenceJoined = (user: PresenceData) => {
			setPresenceUsers((prev) => {
				const next = new Map(prev);
				next.set(user.userId, user);
				return next;
			});
		};

		const handlePresenceLeft = (userId: string) => {
			setPresenceUsers((prev) => {
				const next = new Map(prev);
				next.delete(userId);
				return next;
			});
		};

		const handlePresenceUpdated = (user: PresenceData) => {
			setPresenceUsers((prev) => {
				const next = new Map(prev);
				next.set(user.userId, user);
				return next;
			});
		};

		socket.on("presence:list", handlePresenceList);
		socket.on("presence:joined", handlePresenceJoined);
		socket.on("presence:left", handlePresenceLeft);
		socket.on("presence:updated", handlePresenceUpdated);

		return () => {
			socket.off("presence:list", handlePresenceList);
			socket.off("presence:joined", handlePresenceJoined);
			socket.off("presence:left", handlePresenceLeft);
			socket.off("presence:updated", handlePresenceUpdated);
		};
	}, [socket]);

	// Listen to awareness updates
	useEffect(() => {
		if (!awareness) return;

		const handleAwarenessChange = () => {
			const states = awareness.getStates();
			const newMap = new Map<number, AwarenessUser>();

			states.forEach((state, clientId) => {
				if (state.user) {
					newMap.set(clientId, state.user as AwarenessUser);
				}
			});

			setAwarenessUsers(newMap);
		};

		// Initial state
		handleAwarenessChange();

		awareness.on("change", handleAwarenessChange);
		return () => {
			awareness.off("change", handleAwarenessChange);
		};
	}, [awareness]);

	// Update current page when it changes
	useEffect(() => {
		if (currentPage) {
			updateCurrentPage(currentPage);
		}
	}, [currentPage, updateCurrentPage]);

	return {
		users,
		cursors,
		updateCursor,
		updateStatus,
		updateCurrentPage,
		isUserOnline,
	};
}

// Hook for tracking cursor positions with throttling
export function useCursorTracking(
	updateCursor: (x: number, y: number, elementId?: string) => void,
	enabled = true,
) {
	useEffect(() => {
		if (!enabled) return;

		let lastUpdate = 0;
		const throttleMs = 50; // 20fps

		const handleMouseMove = (e: MouseEvent) => {
			const now = Date.now();
			if (now - lastUpdate < throttleMs) return;
			lastUpdate = now;

			// Try to find the element under cursor
			const element = document.elementFromPoint(e.clientX, e.clientY);
			const elementId = element?.id || undefined;

			updateCursor(e.clientX, e.clientY, elementId);
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [updateCursor, enabled]);
}

// Hook to get presence for a specific user
export function useUserPresence(
	users: UserPresence[],
	userId: string,
): UserPresence | null {
	return useMemo(() => {
		return users.find((u) => u.userId === userId) || null;
	}, [users, userId]);
}
