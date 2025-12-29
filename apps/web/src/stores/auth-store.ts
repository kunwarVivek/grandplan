import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type Session = {
	id: string;
	userId: string;
	expiresAt: Date;
	user: User;
};

type AuthState = {
	// State
	session: Session | null;
	isLoading: boolean;
	isAuthenticated: boolean;

	// Actions
	setSession: (session: Session | null) => void;
	setLoading: (loading: boolean) => void;
	clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			// Initial state
			session: null,
			isLoading: true,
			isAuthenticated: false,

			// Actions
			setSession: (session) =>
				set({
					session,
					isAuthenticated: !!session,
					isLoading: false,
				}),

			setLoading: (isLoading) => set({ isLoading }),

			clearSession: () =>
				set({
					session: null,
					isAuthenticated: false,
					isLoading: false,
				}),
		}),
		{
			name: "grandplan-auth",
			partialize: (state) => ({
				// Only persist session, not loading state
				session: state.session,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.session?.user);
export const useIsAuthenticated = () =>
	useAuthStore((state) => state.isAuthenticated);
export const useIsAuthLoading = () => useAuthStore((state) => state.isLoading);
