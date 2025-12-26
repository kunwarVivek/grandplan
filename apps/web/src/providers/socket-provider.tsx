import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Socket } from "socket.io-client";

import {
	getNotificationsSocket,
	getPresenceSocket,
	getTasksSocket,
} from "@/lib/socket";
import { useIsAuthenticated } from "@/stores";

type SocketContextValue = {
	tasks: Socket | null;
	notifications: Socket | null;
	presence: Socket | null;
	isConnected: boolean;
	connect: () => void;
	disconnect: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

type SocketProviderProps = {
	children: React.ReactNode;
};

export function SocketProvider({ children }: SocketProviderProps) {
	const isAuthenticated = useIsAuthenticated();
	const [isConnected, setIsConnected] = useState(false);

	const tasksSocketRef = useRef<Socket | null>(null);
	const notificationsSocketRef = useRef<Socket | null>(null);
	const presenceSocketRef = useRef<Socket | null>(null);

	const connect = useCallback(() => {
		if (!isAuthenticated) return;

		// Initialize sockets if not already created
		if (!tasksSocketRef.current) {
			tasksSocketRef.current = getTasksSocket();
		}
		if (!notificationsSocketRef.current) {
			notificationsSocketRef.current = getNotificationsSocket();
		}
		if (!presenceSocketRef.current) {
			presenceSocketRef.current = getPresenceSocket();
		}

		// Connect all sockets
		tasksSocketRef.current.connect();
		notificationsSocketRef.current.connect();
		presenceSocketRef.current.connect();

		// Track connection state (using tasks socket as primary)
		tasksSocketRef.current.on("connect", () => setIsConnected(true));
		tasksSocketRef.current.on("disconnect", () => setIsConnected(false));
	}, [isAuthenticated]);

	const disconnect = useCallback(() => {
		tasksSocketRef.current?.disconnect();
		notificationsSocketRef.current?.disconnect();
		presenceSocketRef.current?.disconnect();
		setIsConnected(false);
	}, []);

	// Auto-connect when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			connect();
		} else {
			disconnect();
		}

		return () => {
			disconnect();
		};
	}, [isAuthenticated, connect, disconnect]);

	const value = useMemo(
		() => ({
			tasks: tasksSocketRef.current,
			notifications: notificationsSocketRef.current,
			presence: presenceSocketRef.current,
			isConnected,
			connect,
			disconnect,
		}),
		[isConnected, connect, disconnect],
	);

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
}

export function useSocket() {
	const context = useContext(SocketContext);
	if (!context) {
		throw new Error("useSocket must be used within a SocketProvider");
	}
	return context;
}

export function useTasksSocket() {
	const { tasks } = useSocket();
	return tasks;
}

export function useNotificationsSocket() {
	const { notifications } = useSocket();
	return notifications;
}

export function usePresenceSocket() {
	const { presence } = useSocket();
	return presence;
}
