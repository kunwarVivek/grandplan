import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

export type SuggestedSubtask = {
	title: string;
	description?: string;
	estimatedHours?: number;
	priority?: "urgent" | "high" | "medium" | "low";
};

export type AIDecomposeResult = {
	subtasks: SuggestedSubtask[];
	reasoning?: string;
};

export type AIJobStatus = {
	status: "pending" | "processing" | "completed" | "failed";
	result?: AIDecomposeResult;
	error?: string;
};

export function useDecomposeTask() {
	return useMutation({
		mutationFn: async (taskId: string) => {
			return api.post<{ jobId: string }>(`/api/ai/decompose/${taskId}`, {});
		},
	});
}

export function useAIJobStatus(jobId: string | null) {
	return useQuery({
		queryKey: ["ai", "job", jobId],
		queryFn: async () => {
			return api.get<AIJobStatus>(`/api/ai/jobs/${jobId}`);
		},
		enabled: !!jobId,
		refetchInterval: (query) =>
			query.state.data?.status === "completed" ||
			query.state.data?.status === "failed"
				? false
				: 2000,
	});
}

export function useAcceptDecomposition() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			subtasks,
		}: {
			taskId: string;
			projectId: string;
			subtasks: SuggestedSubtask[];
		}) => {
			return api.post<{ tasks: Array<{ id: string }> }>(
				`/api/ai/decompose/${taskId}/accept`,
				{ subtasks },
			);
		},
		onSuccess: (_, variables) => {
			// Invalidate task queries to show new subtasks
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(variables.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.children(variables.taskId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.detail(variables.taskId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(variables.projectId),
			});
		},
	});
}
