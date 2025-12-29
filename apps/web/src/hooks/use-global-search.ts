import { useQuery } from "@tanstack/react-query";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";
import { api } from "@/lib/api-client";

/**
 * Search results returned from the global search API.
 */
export type SearchResults = {
	tasks: Array<
		Pick<Task, "id" | "title" | "status" | "priority" | "projectId"> & {
			projectName?: string;
		}
	>;
	projects: Array<
		Pick<Project, "id" | "name" | "slug" | "status" | "workspaceId">
	>;
};

/**
 * Hook for performing global search across tasks and projects.
 * Searches are only performed when the query is at least 2 characters.
 *
 * @param query The search query string
 * @returns Query result with tasks and projects matching the search
 */
export function useGlobalSearch(query: string) {
	return useQuery({
		queryKey: ["search", query],
		queryFn: async ({ signal }) => {
			if (!query || query.length < 2) {
				return { tasks: [], projects: [] } satisfies SearchResults;
			}
			return api.get<SearchResults>(
				`/api/search?q=${encodeURIComponent(query)}`,
				signal,
			);
		},
		enabled: query.length >= 2,
		staleTime: 1000 * 30, // 30 seconds
	});
}
