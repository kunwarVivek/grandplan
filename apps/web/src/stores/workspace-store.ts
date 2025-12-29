import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type Workspace = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	organizationId: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkspaceMember = {
	id: string;
	userId: string;
	workspaceId: string;
	role: WorkspaceRole;
	createdAt: Date;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
};

type WorkspaceState = {
	// State
	workspaces: Workspace[];
	activeWorkspace: Workspace | null;
	activeWorkspaceRole: WorkspaceRole | null;
	isLoading: boolean;

	// Actions
	setWorkspaces: (workspaces: Workspace[]) => void;
	setActiveWorkspace: (
		workspace: Workspace | null,
		role?: WorkspaceRole | null,
	) => void;
	addWorkspace: (workspace: Workspace) => void;
	updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
	removeWorkspace: (id: string) => void;
	setLoading: (loading: boolean) => void;
	clear: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
	persist(
		(set) => ({
			// Initial state
			workspaces: [],
			activeWorkspace: null,
			activeWorkspaceRole: null,
			isLoading: false,

			// Actions
			setWorkspaces: (workspaces) => set({ workspaces }),

			setActiveWorkspace: (workspace, role = null) =>
				set({
					activeWorkspace: workspace,
					activeWorkspaceRole: role,
				}),

			addWorkspace: (workspace) =>
				set((state) => ({
					workspaces: [...state.workspaces, workspace],
				})),

			updateWorkspace: (id, updates) =>
				set((state) => ({
					workspaces: state.workspaces.map((ws) =>
						ws.id === id ? { ...ws, ...updates } : ws,
					),
					activeWorkspace:
						state.activeWorkspace?.id === id
							? { ...state.activeWorkspace, ...updates }
							: state.activeWorkspace,
				})),

			removeWorkspace: (id) =>
				set((state) => ({
					workspaces: state.workspaces.filter((ws) => ws.id !== id),
					activeWorkspace:
						state.activeWorkspace?.id === id ? null : state.activeWorkspace,
				})),

			setLoading: (isLoading) => set({ isLoading }),

			clear: () =>
				set({
					workspaces: [],
					activeWorkspace: null,
					activeWorkspaceRole: null,
					isLoading: false,
				}),
		}),
		{
			name: "grandplan-workspace",
			partialize: (state) => ({
				activeWorkspace: state.activeWorkspace,
				activeWorkspaceRole: state.activeWorkspaceRole,
			}),
		},
	),
);

// Selector hooks
export const useActiveWorkspace = () =>
	useWorkspaceStore((state) => state.activeWorkspace);
export const useActiveWorkspaceRole = () =>
	useWorkspaceStore((state) => state.activeWorkspaceRole);
export const useWorkspaces = () =>
	useWorkspaceStore((state) => state.workspaces);
export const useIsWorkspaceAdmin = () => {
	const role = useWorkspaceStore((state) => state.activeWorkspaceRole);
	return role === "OWNER" || role === "ADMIN";
};
