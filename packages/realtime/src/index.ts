// Realtime package - Socket.io + Yjs CRDT infrastructure

export { setupNotificationsNamespace } from "./namespaces/notifications.js";
export { setupPresenceNamespace } from "./namespaces/presence.js";
export { setupTasksNamespace } from "./namespaces/tasks.js";
export { RealtimeServer } from "./server.js";
export * from "./types.js";
