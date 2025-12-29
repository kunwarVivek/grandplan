import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Stale time of 1 minute
				staleTime: 60 * 1000,
				// Cache time of 5 minutes
				gcTime: 5 * 60 * 1000,
				// Retry failed requests 1 time
				retry: (failureCount, error) => {
					// Don't retry on 4xx errors (client errors)
					if (
						error instanceof ApiError &&
						error.status >= 400 &&
						error.status < 500
					) {
						return false;
					}
					return failureCount < 1;
				},
				// Refetch on window focus
				refetchOnWindowFocus: true,
			},
			mutations: {
				// Don't retry mutations
				retry: false,
			},
		},
	});
}

// Query key factory for type-safe and consistent keys
export const queryKeys = {
	// Auth
	session: ["session"] as const,

	// Organizations
	organizations: {
		all: ["organizations"] as const,
		detail: (id: string) => ["organizations", id] as const,
		members: (id: string) => ["organizations", id, "members"] as const,
		invitations: (id: string) => ["organizations", id, "invitations"] as const,
	},

	// Workspaces
	workspaces: {
		all: ["workspaces"] as const,
		detail: (id: string) => ["workspaces", id] as const,
		members: (id: string) => ["workspaces", id, "members"] as const,
	},

	// Projects
	projects: {
		all: (workspaceId?: string) =>
			workspaceId ? ["projects", { workspaceId }] : (["projects"] as const),
		detail: (id: string) => ["projects", id] as const,
		tasks: (id: string) => ["projects", id, "tasks"] as const,
		stats: (id: string) => ["projects", id, "stats"] as const,
	},

	// Tasks
	tasks: {
		all: (projectId?: string) =>
			projectId ? ["tasks", { projectId }] : (["tasks"] as const),
		detail: (id: string) => ["tasks", id] as const,
		children: (id: string) => ["tasks", id, "children"] as const,
		descendants: (id: string) => ["tasks", id, "descendants"] as const,
		ancestors: (id: string) => ["tasks", id, "ancestors"] as const,
		dependencies: (id: string) => ["tasks", id, "dependencies"] as const,
		history: (id: string) => ["tasks", id, "history"] as const,
		comments: (id: string) => ["tasks", id, "comments"] as const,
	},

	// Teams
	teams: {
		all: ["teams"] as const,
		myTeams: ["teams", "my-teams"] as const,
		detail: (id: string) => ["teams", id] as const,
		members: (id: string) => ["teams", id, "members"] as const,
	},

	// AI
	ai: {
		decisions: (taskId: string) => ["ai", "decisions", taskId] as const,
		quality: (taskId: string) => ["ai", "quality", taskId] as const,
	},

	// Billing
	billing: {
		subscription: ["billing", "subscription"] as const,
		plans: ["billing", "plans"] as const,
		invoices: ["billing", "invoices"] as const,
		usage: ["billing", "usage"] as const,
		limits: ["billing", "limits"] as const,
	},

	// Notifications
	notifications: {
		all: ["notifications"] as const,
		unreadCount: ["notifications", "unread-count"] as const,
		summary: ["notifications", "summary"] as const,
		preferences: ["notifications", "preferences"] as const,
		pushSubscriptions: ["notifications", "push", "subscriptions"] as const,
	},

	// Platform Admin
	platform: {
		users: ["platform", "users"] as const,
		userDetail: (id: string) => ["platform", "users", id] as const,
		organizations: ["platform", "organizations"] as const,
		orgDetail: (id: string) => ["platform", "organizations", id] as const,
		subscriptions: ["platform", "subscriptions"] as const,
		plans: ["platform", "plans"] as const,
		analytics: ["platform", "analytics"] as const,
		system: ["platform", "system"] as const,
	},

	// Integrations
	integrations: {
		connections: ["integrations", "connections"] as const,
		available: ["integrations", "available"] as const,
	},
} as const;

// Singleton query client instance
export const queryClient = createQueryClient();
