import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

export type ModalType =
	| "create-workspace"
	| "create-project"
	| "create-task"
	| "task-detail"
	| "invite-member"
	| "confirm-delete"
	| "ai-decompose"
	| "command-palette"
	| null;

export type ModalData = {
	taskId?: string;
	projectId?: string;
	workspaceId?: string;
	title?: string;
	message?: string;
	onConfirm?: () => void;
	[key: string]: unknown;
};

type UIState = {
	// Sidebar
	sidebarCollapsed: boolean;
	sidebarWidth: number;

	// Theme
	theme: Theme;

	// Modal
	activeModal: ModalType;
	modalData: ModalData | null;

	// Command palette
	commandPaletteOpen: boolean;

	// Task detail panel
	taskDetailOpen: boolean;
	taskDetailId: string | null;

	// View preferences
	taskViewMode: "kanban" | "tree" | "list" | "timeline";

	// Actions
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	setSidebarWidth: (width: number) => void;
	setTheme: (theme: Theme) => void;
	openModal: (type: ModalType, data?: ModalData) => void;
	closeModal: () => void;
	toggleCommandPalette: () => void;
	openTaskDetail: (taskId: string) => void;
	closeTaskDetail: () => void;
	setTaskViewMode: (mode: "kanban" | "tree" | "list" | "timeline") => void;
};

export const useUIStore = create<UIState>()(
	persist(
		(set) => ({
			// Initial state
			sidebarCollapsed: false,
			sidebarWidth: 256,
			theme: "dark",
			activeModal: null,
			modalData: null,
			commandPaletteOpen: false,
			taskDetailOpen: false,
			taskDetailId: null,
			taskViewMode: "kanban",

			// Actions
			toggleSidebar: () =>
				set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

			setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

			setSidebarWidth: (width) => set({ sidebarWidth: width }),

			setTheme: (theme) => set({ theme }),

			openModal: (type, data) =>
				set({
					activeModal: type,
					modalData: data ?? null,
				}),

			closeModal: () =>
				set({
					activeModal: null,
					modalData: null,
				}),

			toggleCommandPalette: () =>
				set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

			openTaskDetail: (taskId) =>
				set({
					taskDetailOpen: true,
					taskDetailId: taskId,
				}),

			closeTaskDetail: () =>
				set({
					taskDetailOpen: false,
					taskDetailId: null,
				}),

			setTaskViewMode: (mode) => set({ taskViewMode: mode }),
		}),
		{
			name: "grandplan-ui",
			partialize: (state) => ({
				sidebarCollapsed: state.sidebarCollapsed,
				sidebarWidth: state.sidebarWidth,
				theme: state.theme,
				taskViewMode: state.taskViewMode,
			}),
		},
	),
);

// Selector hooks
export const useSidebarCollapsed = () =>
	useUIStore((state) => state.sidebarCollapsed);
export const useTheme = () => useUIStore((state) => state.theme);
export const useActiveModal = () => useUIStore((state) => state.activeModal);
export const useModalData = () => useUIStore((state) => state.modalData);
export const useTaskViewMode = () => useUIStore((state) => state.taskViewMode);
export const useTaskDetailState = () =>
	useUIStore((state) => ({
		isOpen: state.taskDetailOpen,
		taskId: state.taskDetailId,
	}));
