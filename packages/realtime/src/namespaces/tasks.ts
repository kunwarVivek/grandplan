// ============================================
// TASKS NAMESPACE - Yjs CRDT sync for tasks
// ============================================

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { Namespace, Socket } from "socket.io";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	SocketData,
} from "../types.js";

// Document storage (in production, persist to database)
const documents = new Map<string, Y.Doc>();
const awarenessMap = new Map<string, awarenessProtocol.Awareness>();

function getOrCreateDocument(projectId: string): {
	doc: Y.Doc;
	awareness: awarenessProtocol.Awareness;
} {
	let doc = documents.get(projectId);
	let awareness = awarenessMap.get(projectId);

	if (!doc) {
		doc = new Y.Doc();
		documents.set(projectId, doc);

		// Initialize document structure
		doc.getMap("tasks");
		doc.getArray("taskOrder");
		doc.getMap("comments");
		doc.getMap("metadata");
	}

	if (!awareness) {
		awareness = new awarenessProtocol.Awareness(doc);
		awarenessMap.set(projectId, awareness);
	}

	return { doc, awareness };
}

export function setupTasksNamespace(
	namespace: Namespace<
		ClientToServerEvents,
		ServerToClientEvents,
		never,
		SocketData
	>,
): void {
	namespace.on("connection", (socket) => {
		console.log(`Tasks namespace: Client connected ${socket.id}`);

		let currentProjectId: string | null = null;
		let currentAwareness: awarenessProtocol.Awareness | null = null;

		// Join a project room for CRDT sync
		socket.on("room:join", async (projectId) => {
			// Leave previous room
			if (currentProjectId) {
				socket.leave(`project:${currentProjectId}`);
				if (currentAwareness) {
					awarenessProtocol.removeAwarenessStates(
						currentAwareness,
						[socket.data.userId as unknown as number],
						null,
					);
				}
			}

			currentProjectId = projectId;
			socket.join(`project:${projectId}`);

			const { doc, awareness } = getOrCreateDocument(projectId);
			currentAwareness = awareness;

			// Send initial sync
			const encoder = encoding.createEncoder();
			encoding.writeVarUint(encoder, 0); // sync step 1
			syncProtocol.writeSyncStep1(encoder, doc);
			socket.emit("sync:update", encoding.toUint8Array(encoder));

			// Send current awareness state
			const awarenessEncoder = encoding.createEncoder();
			encoding.writeVarUint8Array(
				awarenessEncoder,
				awarenessProtocol.encodeAwarenessUpdate(
					awareness,
					Array.from(awareness.getStates().keys()),
				),
			);
			socket.emit("sync:awareness", encoding.toUint8Array(awarenessEncoder));

			console.log(`Socket ${socket.id} joined project ${projectId}`);
		});

		// Leave a project room
		socket.on("room:leave", (projectId) => {
			socket.leave(`project:${projectId}`);
			if (currentProjectId === projectId) {
				currentProjectId = null;
				currentAwareness = null;
			}
		});

		// Handle Yjs sync updates
		socket.on("sync:update", (update) => {
			if (!currentProjectId) return;

			const { doc } = getOrCreateDocument(currentProjectId);
			const decoder = decoding.createDecoder(update);
			const messageType = decoding.readVarUint(decoder);

			const encoder = encoding.createEncoder();
			encoding.writeVarUint(encoder, messageType);

			switch (messageType) {
				case 0: // sync step 1
					syncProtocol.readSyncStep1(decoder, encoder, doc);
					if (encoding.length(encoder) > 1) {
						socket.emit("sync:update", encoding.toUint8Array(encoder));
					}
					break;

				case 1: // sync step 2
					syncProtocol.readSyncStep2(decoder, doc, null);
					break;

				case 2: // update
					syncProtocol.readUpdate(decoder, doc, null);
					// Broadcast to other clients in the room
					socket.to(`project:${currentProjectId}`).emit("sync:update", update);
					break;
			}
		});

		// Handle awareness updates (cursors, selections, etc.)
		socket.on("sync:awareness", (update) => {
			if (!currentProjectId || !currentAwareness) return;

			awarenessProtocol.applyAwarenessUpdate(currentAwareness, update, socket);

			// Broadcast to other clients
			socket.to(`project:${currentProjectId}`).emit("sync:awareness", update);
		});

		// Handle cursor movement
		socket.on("cursor:move", (cursor) => {
			if (!currentProjectId) return;

			socket.to(`project:${currentProjectId}`).emit("cursor:moved", {
				...cursor,
				userId: socket.data.userId,
			});
		});

		socket.on("disconnect", () => {
			if (currentAwareness) {
				awarenessProtocol.removeAwarenessStates(
					currentAwareness,
					[socket.data.userId as unknown as number],
					null,
				);

				// Broadcast awareness removal
				if (currentProjectId) {
					const encoder = encoding.createEncoder();
					encoding.writeVarUint8Array(
						encoder,
						awarenessProtocol.encodeAwarenessUpdate(
							currentAwareness,
							[socket.data.userId as unknown as number],
							new Map(),
						),
					);
					socket
						.to(`project:${currentProjectId}`)
						.emit("sync:awareness", encoding.toUint8Array(encoder));
				}
			}

			console.log(`Tasks namespace: Client disconnected ${socket.id}`);
		});
	});
}
