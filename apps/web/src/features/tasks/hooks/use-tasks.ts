import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { useTasksSocket } from "@/providers";
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

// Paginated response type for infinite scroll
type PaginatedTasksResponse = TasksResponse & {
	nextCursor?: string | null;
	hasMore: boolean;
};

// Default page size for infinite scroll
const DEFAULT_PAGE_SIZE = 20;

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

// Fetch tasks with infinite scroll/pagination
export function useInfiniteTasksQuery(
	projectId: string,
	filters?: TaskFilters,
	options?: { pageSize?: number },
) {
	const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

	return useInfiniteQuery({
		queryKey: [...queryKeys.tasks.all(projectId), "infinite", filters],
		queryFn: async ({ pageParam, signal }) => {
			const params = new URLSearchParams();

			// Add pagination params
			params.set("limit", pageSize.toString());
			if (pageParam) {
				params.set("cursor", pageParam);
			}

			// Add filter params
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

			// API returns PaginatedTasksResponse with cursor-based pagination
			// Falls back to calculating hasMore from total if no cursor provided
			const response = await api.get<PaginatedTasksResponse>(endpoint, signal);

			// If API doesn't return pagination info, calculate it from total
			if (response.hasMore === undefined) {
				const currentCount = response.tasks.length;
				return {
					...response,
					hasMore: currentCount >= pageSize,
					nextCursor:
						currentCount >= pageSize
							? response.tasks[currentCount - 1]?.id
							: null,
				};
			}

			return response;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.hasMore ? lastPage.nextCursor : undefined,
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
		onMutate: async (input) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.tasks.all(input.projectId),
			});

			// Snapshot previous value
			const previousTasks = queryClient.getQueryData<TasksResponse>(
				queryKeys.tasks.all(input.projectId),
			);

			// Create optimistic task with temporary ID
			const optimisticTask: Task = {
				id: `temp-${Date.now()}`,
				projectId: input.projectId,
				title: input.title,
				description: input.description ?? null,
				status: input.status ?? "todo",
				priority: input.priority ?? "medium",
				assigneeId: input.assigneeId ?? null,
				parentId: input.parentId ?? null,
				dueDate: input.dueDate ?? null,
				startDate: input.startDate ?? null,
				estimatedHours: input.estimatedHours ?? null,
				actualHours: null,
				tags: input.tags ?? [],
				dependencies: [],
				progress: 0,
				position: 0,
				depth: input.parentId ? 1 : 0,
				childCount: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Optimistically add task to list
			if (previousTasks) {
				queryClient.setQueryData<TasksResponse>(
					queryKeys.tasks.all(input.projectId),
					{
						...previousTasks,
						tasks: [optimisticTask, ...previousTasks.tasks],
						total: previousTasks.total + 1,
					},
				);
			}

			return { previousTasks, optimisticTask };
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
		}: UpdateTaskInput & { taskId: string; projectId: string }) => {
			return api.patch<TaskResponse>(`/api/tasks/${taskId}`, input);
		},
		onMutate: async ({ taskId, projectId, ...updates }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.tasks.all(projectId),
			});
			await queryClient.cancelQueries({
				queryKey: queryKeys.tasks.detail(taskId),
			});

			// Snapshot previous values
			const previousTasks = queryClient.getQueryData<TasksResponse>(
				queryKeys.tasks.all(projectId),
			);
			const previousTask = queryClient.getQueryData<Task>(
				queryKeys.tasks.detail(taskId),
			);

			// Optimistically update task in list
			if (previousTasks) {
				const updatedTasks = previousTasks.tasks.map((task) =>
					task.id === taskId ? { ...task, ...updates } : task,
				);
				queryClient.setQueryData<TasksResponse>(
					queryKeys.tasks.all(projectId),
					{
						...previousTasks,
						tasks: updatedTasks,
					},
				);
			}

			// Optimistically update task detail
			if (previousTask) {
				queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), {
					...previousTask,
					...updates,
				});
			}

			return { previousTasks, previousTask, projectId };
		},
		onError: (_, variables, context) => {
			// Rollback on error
			if (context?.previousTasks) {
				queryClient.setQueryData(
					queryKeys.tasks.all(context.projectId),
					context.previousTasks,
				);
			}
			if (context?.previousTask) {
				queryClient.setQueryData(
					queryKeys.tasks.detail(variables.taskId),
					context.previousTask,
				);
			}
		},
		onSettled: (data, _, variables, context) => {
			const projectId = data?.projectId ?? context?.projectId;
			if (projectId) {
				// Refetch to ensure consistency
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.all(projectId),
				});
				// Invalidate project stats if status changed
				queryClient.invalidateQueries({
					queryKey: queryKeys.projects.stats(projectId),
				});
			}
			// Always invalidate the task detail
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.detail(variables.taskId),
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

/**
 * Hook to sync task queries with realtime socket events.
 * Listens to task:created, task:updated, task:deleted events
 * and invalidates relevant queries for real-time updates.
 */
export function useTasksRealtimeSync(projectId: string | null) {
	const queryClient = useQueryClient();
	const socket = useTasksSocket();

	useEffect(() => {
		if (!socket || !projectId) return;

		// Join project room for task events
		socket.emit("room:join", `project:${projectId}`);

		const handleTaskCreated = (_data: { id: string; data: unknown }) => {
			// Invalidate tasks list to show new task
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(projectId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(projectId),
			});
		};

		const handleTaskUpdated = (data: {
			taskId: string;
			changes: Record<string, unknown>;
		}) => {
			// Invalidate specific task and list
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.detail(data.taskId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(projectId),
			});
			// If status changed, update stats
			if (data.changes.status) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.projects.stats(projectId),
				});
			}
		};

		const handleTaskDeleted = (taskId: string) => {
			// Remove task from cache and invalidate list
			queryClient.removeQueries({
				queryKey: queryKeys.tasks.detail(taskId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all(projectId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.stats(projectId),
			});
		};

		socket.on("task:created", handleTaskCreated);
		socket.on("task:updated", handleTaskUpdated);
		socket.on("task:deleted", handleTaskDeleted);

		return () => {
			socket.emit("room:leave", `project:${projectId}`);
			socket.off("task:created", handleTaskCreated);
			socket.off("task:updated", handleTaskUpdated);
			socket.off("task:deleted", handleTaskDeleted);
		};
	}, [socket, projectId, queryClient]);
}
