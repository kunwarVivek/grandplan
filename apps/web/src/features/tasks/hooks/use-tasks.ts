import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
	CreateTaskInput,
	MoveTaskInput,
	Task,
	TaskFilters,
	UpdateTaskInput,
} from "../types";

// Types for API responses
type TasksResponse = {
	tasks: Task[];
	total: number;
};

type TaskResponse = Task;

// Fetch all tasks for a project
export function useTasks(projectId: string, filters?: TaskFilters) {
	return useQuery({
		queryKey: [...queryKeys.tasks.all(projectId), filters],
		queryFn: async ({ signal }) => {
			const params = new URLSearchParams();
			if (filters?.status?.length) {
				params.set("status", filters.status.join(","));
			}
			if (filters?.priority?.length) {
				params.set("priority", filters.priority.join(","));
			}
			if (filters?.assigneeId?.length) {
				params.set("assigneeId", filters.assigneeId.join(","));
			}
			if (filters?.search) {
				params.set("search", filters.search);
			}
			if (filters?.dueDateFrom) {
				params.set("dueDateFrom", filters.dueDateFrom.toISOString());
			}
			if (filters?.dueDateTo) {
				params.set("dueDateTo", filters.dueDateTo.toISOString());
			}

			const query = params.toString();
			const endpoint = `/api/projects/${projectId}/tasks${query ? `?${query}` : ""}`;
			return api.get<TasksResponse>(endpoint, signal);
		},
		enabled: !!projectId,
	});
}

// Fetch a single task
export function useTask(taskId: string) {
	return useQuery({
		queryKey: queryKeys.tasks.detail(taskId),
		queryFn: async ({ signal }) => {
			return api.get<TaskResponse>(`/api/tasks/${taskId}`, signal);
		},
		enabled: !!taskId,
	});
}

// Fetch task children (subtasks)
export function useTaskChildren(taskId: string) {
	return useQuery({
		queryKey: queryKeys.tasks.children(taskId),
		queryFn: async ({ signal }) => {
			return api.get<TasksResponse>(`/api/tasks/${taskId}/children`, signal);
		},
		enabled: !!taskId,
	});
}

// Create a new task
export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateTaskInput) => {
			return api.post<TaskResponse>(
				`/api/projects/${input.projectId}/tasks`,
				input,
			);
		},
		onSuccess: (_, variables) => {
			// Invalidate project tasks list
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(variables.projectId),
			});
			// Invalidate project stats
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(variables.projectId),
			});
			// If creating a subtask, invalidate parent's children
			if (variables.parentId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.children(variables.parentId),
				});
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.detail(variables.parentId),
				});
			}
		},
	});
}

// Update a task
export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			...input
		}: UpdateTaskInput & { taskId: string }) => {
			return api.patch<TaskResponse>(`/api/tasks/${taskId}`, input);
		},
		onSuccess: (data) => {
			// Update the task in cache
			queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
			// Invalidate tasks list
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(data.projectId),
			});
			// Invalidate project stats if status changed
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(data.projectId),
			});
		},
	});
}

// Delete a task
export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
		}: {
			taskId: string;
			projectId: string;
			parentId?: string;
		}) => {
			return api.delete<void>(`/api/tasks/${taskId}`);
		},
		onSuccess: (_, variables) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: queryKeys.tasks.detail(variables.taskId),
			});
			// Invalidate tasks list
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(variables.projectId),
			});
			// Invalidate project stats
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(variables.projectId),
			});
			// If was a subtask, invalidate parent's children
			if (variables.parentId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.children(variables.parentId),
				});
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.detail(variables.parentId),
				});
			}
		},
	});
}

// Move a task (for drag-and-drop)
export function useMoveTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			projectId,
			...input
		}: MoveTaskInput & { projectId: string }) => {
			return api.patch<TaskResponse>(`/api/tasks/${taskId}/move`, input);
		},
		onMutate: async ({ taskId, projectId, targetStatus, targetPosition }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.tasks.all(projectId),
			});

			// Snapshot previous value
			const previousTasks = queryClient.getQueryData<TasksResponse>(
				queryKeys.tasks.all(projectId),
			);

			// Optimistically update
			if (previousTasks && targetStatus !== undefined) {
				const updatedTasks = previousTasks.tasks.map((task) =>
					task.id === taskId
						? {
								...task,
								status: targetStatus,
								position: targetPosition ?? task.position,
							}
						: task,
				);

				queryClient.setQueryData<TasksResponse>(
					queryKeys.tasks.all(projectId),
					{
						...previousTasks,
						tasks: updatedTasks,
					},
				);
			}

			return { previousTasks };
		},
		onError: (_, variables, context) => {
			// Rollback on error
			if (context?.previousTasks) {
				queryClient.setQueryData(
					queryKeys.tasks.all(variables.projectId),
					context.previousTasks,
				);
			}
		},
		onSettled: (_, __, variables) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(variables.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(variables.projectId),
			});
		},
	});
}

// Bulk update tasks
export function useBulkUpdateTasks() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskIds,
			projectId,
			updates,
		}: {
			taskIds: string[];
			projectId: string;
			updates: UpdateTaskInput;
		}) => {
			return api.patch<{ tasks: Task[] }>(
				`/api/projects/${projectId}/tasks/bulk`,
				{
					taskIds,
					updates,
				},
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(variables.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(variables.projectId),
			});
		},
	});
}
