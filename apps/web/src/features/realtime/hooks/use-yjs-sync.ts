// ============================================
// YJS SYNCHRONIZATION HOOK
// ============================================

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
	Awareness,
	applyAwarenessUpdate,
	encodeAwarenessUpdate,
} from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

import { useTasksSocket } from "@/providers";
import type { AwarenessUser, SyncState } from "../types";
import { getColorForUser } from "../types";

type UseYjsDocumentOptions = {
	userId: string;
	userName: string;
	userAvatar?: string;
};

type UseYjsDocumentReturn = {
	doc: Y.Doc | null;
	awareness: Awareness | null;
	syncState: SyncState;
	isConnected: boolean;
	reconnect: () => void;
};

export function useYjsDocument(
	projectId: string | null,
	options: UseYjsDocumentOptions,
): UseYjsDocumentReturn {
	const socket = useTasksSocket();
	const [syncState, setSyncState] = useState<SyncState>("disconnected");
	const [isConnected, setIsConnected] = useState(false);

	const docRef = useRef<Y.Doc | null>(null);
	const awarenessRef = useRef<Awareness | null>(null);
	const currentProjectRef = useRef<string | null>(null);

	// Initialize Yjs document
	const initDocument = useCallback(() => {
		if (!docRef.current) {
			docRef.current = new Y.Doc();
		}
		if (!awarenessRef.current) {
			awarenessRef.current = new Awareness(docRef.current);
		}
		return { doc: docRef.current, awareness: awarenessRef.current };
	}, []);

	// Set up awareness with user data
	const setupAwareness = useCallback(
		(awareness: Awareness) => {
			const awarenessUser: AwarenessUser = {
				userId: options.userId,
				name: options.userName,
				avatar: options.userAvatar,
				color: getColorForUser(options.userId),
				status: "online",
			};
			awareness.setLocalStateField("user", awarenessUser);
		},
		[options.userId, options.userName, options.userAvatar],
	);

	// Handle sync messages from server
	const handleSyncUpdate = useCallback(
		(update: Uint8Array) => {
			const doc = docRef.current;
			if (!doc) return;

			const decoder = decoding.createDecoder(update);
			const messageType = decoding.readVarUint(decoder);

			switch (messageType) {
				case 0: {
					// Sync step 1 - Server is sending its state vector
					const encoder = encoding.createEncoder();
					encoding.writeVarUint(encoder, 1); // sync step 2
					syncProtocol.readSyncStep1(decoder, encoder, doc);

					if (encoding.length(encoder) > 1 && socket) {
						socket.emit("sync:update", encoding.toUint8Array(encoder));
					}
					setSyncState("syncing");
					break;
				}
				case 1: {
					// Sync step 2 - Server is sending document update
					syncProtocol.readSyncStep2(decoder, doc, null);
					setSyncState("synced");
					break;
				}
				case 2: {
					// Document update
					syncProtocol.readUpdate(decoder, doc, null);
					break;
				}
			}
		},
		[socket],
	);

	// Handle awareness updates from server
	const handleAwarenessUpdate = useCallback((update: Uint8Array) => {
		const awareness = awarenessRef.current;
		if (!awareness) return;

		const decoder = decoding.createDecoder(update);
		const awarenessUpdate = decoding.readVarUint8Array(decoder);
		applyAwarenessUpdate(awareness, awarenessUpdate, "server");
	}, []);

	// Send local document updates to server
	const handleDocumentUpdate = useCallback(
		(update: Uint8Array, origin: unknown) => {
			// Don't send updates that originated from the server
			if (origin === "server" || origin === null) return;
			if (!socket?.connected) return;

			const encoder = encoding.createEncoder();
			encoding.writeVarUint(encoder, 2); // update message type
			encoding.writeVarUint8Array(encoder, update);
			socket.emit("sync:update", encoding.toUint8Array(encoder));
		},
		[socket],
	);

	// Send local awareness updates to server
	const handleLocalAwarenessUpdate = useCallback(
		(changes: { added: number[]; updated: number[]; removed: number[] }) => {
			const awareness = awarenessRef.current;
			if (!awareness || !socket?.connected) return;

			const changedClients = [
				...changes.added,
				...changes.updated,
				...changes.removed,
			];
			const encoder = encoding.createEncoder();
			encoding.writeVarUint8Array(
				encoder,
				encodeAwarenessUpdate(awareness, changedClients),
			);
			socket.emit("sync:awareness", encoding.toUint8Array(encoder));
		},
		[socket],
	);

	// Connect to a project room
	const connectToProject = useCallback(
		(projectId: string, socket: Socket) => {
			const { doc, awareness } = initDocument();

			// Set up awareness
			setupAwareness(awareness);

			// Subscribe to document changes
			doc.on("update", handleDocumentUpdate);

			// Subscribe to awareness changes
			awareness.on("update", handleLocalAwarenessUpdate);

			// Join the project room
			socket.emit("room:join", projectId);
			currentProjectRef.current = projectId;
			setSyncState("connecting");
		},
		[
			initDocument,
			setupAwareness,
			handleDocumentUpdate,
			handleLocalAwarenessUpdate,
		],
	);

	// Disconnect from current project
	const disconnectFromProject = useCallback(() => {
		const doc = docRef.current;
		const awareness = awarenessRef.current;

		if (doc) {
			doc.off("update", handleDocumentUpdate);
		}

		if (awareness) {
			awareness.off("update", handleLocalAwarenessUpdate);
		}

		if (socket?.connected && currentProjectRef.current) {
			socket.emit("room:leave", currentProjectRef.current);
		}

		currentProjectRef.current = null;
		setSyncState("disconnected");
	}, [socket, handleDocumentUpdate, handleLocalAwarenessUpdate]);

	// Reconnect handler
	const reconnect = useCallback(() => {
		if (projectId && socket?.connected) {
			disconnectFromProject();
			connectToProject(projectId, socket);
		}
	}, [projectId, socket, disconnectFromProject, connectToProject]);

	// Set up socket event handlers
	useEffect(() => {
		if (!socket) return;

		const handleConnect = () => {
			setIsConnected(true);
			if (projectId) {
				connectToProject(projectId, socket);
			}
		};

		const handleDisconnect = () => {
			setIsConnected(false);
			setSyncState("disconnected");
		};

		const handleError = () => {
			setSyncState("error");
		};

		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);
		socket.on("error", handleError);
		socket.on("sync:update", handleSyncUpdate);
		socket.on("sync:awareness", handleAwarenessUpdate);

		// If already connected, join the room
		if (socket.connected && projectId) {
			connectToProject(projectId, socket);
			setIsConnected(true);
		}

		return () => {
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
			socket.off("error", handleError);
			socket.off("sync:update", handleSyncUpdate);
			socket.off("sync:awareness", handleAwarenessUpdate);
			disconnectFromProject();
		};
	}, [
		socket,
		projectId,
		connectToProject,
		disconnectFromProject,
		handleSyncUpdate,
		handleAwarenessUpdate,
	]);

	// Handle projectId changes
	useEffect(() => {
		if (!socket?.connected) return;

		if (projectId && projectId !== currentProjectRef.current) {
			disconnectFromProject();
			connectToProject(projectId, socket);
		} else if (!projectId && currentProjectRef.current) {
			disconnectFromProject();
		}
	}, [projectId, socket, connectToProject, disconnectFromProject]);

	// Handle visibility change (tab focus)
	useEffect(() => {
		const handleVisibilityChange = () => {
			const awareness = awarenessRef.current;
			if (!awareness) return;

			if (document.hidden) {
				awareness.setLocalStateField("user", {
					...awareness.getLocalState()?.user,
					status: "away",
				});
			} else {
				awareness.setLocalStateField("user", {
					...awareness.getLocalState()?.user,
					status: "online",
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return {
		doc: docRef.current,
		awareness: awarenessRef.current,
		syncState,
		isConnected,
		reconnect,
	};
}

// Hook to access specific Yjs shared types
export function useYjsMap<T>(
	doc: Y.Doc | null,
	mapName: string,
): Y.Map<T> | null {
	const [map, setMap] = useState<Y.Map<T> | null>(null);

	useEffect(() => {
		if (doc) {
			setMap(doc.getMap<T>(mapName));
		} else {
			setMap(null);
		}
	}, [doc, mapName]);

	return map;
}

export function useYjsArray<T>(
	doc: Y.Doc | null,
	arrayName: string,
): Y.Array<T> | null {
	const [array, setArray] = useState<Y.Array<T> | null>(null);

	useEffect(() => {
		if (doc) {
			setArray(doc.getArray<T>(arrayName));
		} else {
			setArray(null);
		}
	}, [doc, arrayName]);

	return array;
}
