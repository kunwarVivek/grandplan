import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	Task,
	TaskFilters,
	TaskPriority,
	TaskStatus,
} from "../features/tasks/types";

export type TaskViewMode = "kanban" | "list" | "tree" | "timeline";

type TaskState = {
	// UI State
	viewMode: TaskViewMode;
	selectedTaskId: string | null;
	selectedTaskIds: string[];
	expandedTaskIds: string[];
	isDetailPanelOpen: boolean;

	// Filter State
	activeFilters: TaskFilters;

	// Sorting State
	sortBy: "position" | "priority" | "dueDate" | "createdAt" | "title";
	sortOrder: "asc" | "desc";

	// Actions
	setViewMode: (mode: TaskViewMode) => void;
	setSelectedTask: (taskId: string | null) => void;
	toggleTaskSelection: (taskId: string) => void;
	selectTasks: (taskIds: string[]) => void;
	clearSelection: () => void;
	toggleTaskExpanded: (taskId: string) => void;
	expandTasks: (taskIds: string[]) => void;
	collapseTasks: (taskIds: string[]) => void;
	setDetailPanelOpen: (open: boolean) => void;

	// Filter Actions
	setFilter: <K extends keyof TaskFilters>(
		key: K,
		value: TaskFilters[K],
	) => void;
	setFilters: (filters: TaskFilters) => void;
	clearFilters: () => void;
	toggleStatusFilter: (status: TaskStatus) => void;
	togglePriorityFilter: (priority: TaskPriority) => void;

	// Sort Actions
	setSortBy: (sortBy: TaskState["sortBy"]) => void;
	setSortOrder: (order: "asc" | "desc") => void;
	toggleSortOrder: () => void;

	// Reset
	reset: () => void;
};

const initialState = {
	viewMode: "kanban" as TaskViewMode,
	selectedTaskId: null,
	selectedTaskIds: [],
	expandedTaskIds: [],
	isDetailPanelOpen: false,
	activeFilters: {},
	sortBy: "position" as const,
	sortOrder: "asc" as const,
};

export const useTaskStore = create<TaskState>()(
	persist(
		(set) => ({
			...initialState,

			// View Mode Actions
			setViewMode: (viewMode) => set({ viewMode }),

			// Selection Actions
			setSelectedTask: (taskId) =>
				set({
					selectedTaskId: taskId,
					isDetailPanelOpen: taskId !== null,
				}),

			toggleTaskSelection: (taskId) =>
				set((state) => ({
					selectedTaskIds: state.selectedTaskIds.includes(taskId)
						? state.selectedTaskIds.filter((id) => id !== taskId)
						: [...state.selectedTaskIds, taskId],
				})),

			selectTasks: (taskIds) => set({ selectedTaskIds: taskIds }),

			clearSelection: () =>
				set({
					selectedTaskId: null,
					selectedTaskIds: [],
				}),

			// Expand/Collapse Actions
			toggleTaskExpanded: (taskId) =>
				set((state) => ({
					expandedTaskIds: state.expandedTaskIds.includes(taskId)
						? state.expandedTaskIds.filter((id) => id !== taskId)
						: [...state.expandedTaskIds, taskId],
				})),

			expandTasks: (taskIds) =>
				set((state) => ({
					expandedTaskIds: [...new Set([...state.expandedTaskIds, ...taskIds])],
				})),

			collapseTasks: (taskIds) =>
				set((state) => ({
					expandedTaskIds: state.expandedTaskIds.filter(
						(id) => !taskIds.includes(id),
					),
				})),

			// Detail Panel
			setDetailPanelOpen: (isDetailPanelOpen) => set({ isDetailPanelOpen }),

			// Filter Actions
			setFilter: (key, value) =>
				set((state) => ({
					activeFilters: {
						...state.activeFilters,
						[key]: value,
					},
				})),

			setFilters: (activeFilters) => set({ activeFilters }),

			clearFilters: () => set({ activeFilters: {} }),

			toggleStatusFilter: (status) =>
				set((state) => {
					const current = state.activeFilters.status ?? [];
					const newStatus = current.includes(status)
						? current.filter((s) => s !== status)
						: [...current, status];
					return {
						activeFilters: {
							...state.activeFilters,
							status: newStatus.length > 0 ? newStatus : undefined,
						},
					};
				}),

			togglePriorityFilter: (priority) =>
				set((state) => {
					const current = state.activeFilters.priority ?? [];
					const newPriority = current.includes(priority)
						? current.filter((p) => p !== priority)
						: [...current, priority];
					return {
						activeFilters: {
							...state.activeFilters,
							priority: newPriority.length > 0 ? newPriority : undefined,
						},
					};
				}),

			// Sort Actions
			setSortBy: (sortBy) => set({ sortBy }),

			setSortOrder: (sortOrder) => set({ sortOrder }),

			toggleSortOrder: () =>
				set((state) => ({
					sortOrder: state.sortOrder === "asc" ? "desc" : "asc",
				})),

			// Reset
			reset: () => set(initialState),
		}),
		{
			name: "grandplan-tasks",
			partialize: (state) => ({
				viewMode: state.viewMode,
				activeFilters: state.activeFilters,
				sortBy: state.sortBy,
				sortOrder: state.sortOrder,
				expandedTaskIds: state.expandedTaskIds,
			}),
		},
	),
);

// Selector hooks for common use cases
export const useTaskViewMode = () => useTaskStore((state) => state.viewMode);
export const useSelectedTask = () =>
	useTaskStore((state) => state.selectedTaskId);
export const useSelectedTasks = () =>
	useTaskStore((state) => state.selectedTaskIds);
export const useTaskFilters = () =>
	useTaskStore((state) => state.activeFilters);
export const useIsTaskExpanded = (taskId: string) =>
	useTaskStore((state) => state.expandedTaskIds.includes(taskId));
export const useIsDetailPanelOpen = () =>
	useTaskStore((state) => state.isDetailPanelOpen);

// Helper to filter tasks based on active filters
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
	return tasks.filter((task) => {
		// Status filter
		if (filters.status && filters.status.length > 0) {
			if (!filters.status.includes(task.status)) return false;
		}

		// Priority filter
		if (filters.priority && filters.priority.length > 0) {
			if (!filters.priority.includes(task.priority)) return false;
		}

		// Assignee filter
		if (filters.assigneeId && filters.assigneeId.length > 0) {
			if (!task.assigneeId || !filters.assigneeId.includes(task.assigneeId))
				return false;
		}

		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			const titleMatch = task.title.toLowerCase().includes(searchLower);
			const descMatch = task.description?.toLowerCase().includes(searchLower);
			if (!titleMatch && !descMatch) return false;
		}

		// Due date range filter
		if (filters.dueDateFrom && task.dueDate) {
			if (new Date(task.dueDate) < filters.dueDateFrom) return false;
		}
		if (filters.dueDateTo && task.dueDate) {
			if (new Date(task.dueDate) > filters.dueDateTo) return false;
		}

		return true;
	});
}

// Helper to sort tasks
export function sortTasks(
	tasks: Task[],
	sortBy: TaskState["sortBy"],
	sortOrder: "asc" | "desc",
): Task[] {
	const sorted = [...tasks].sort((a, b) => {
		let comparison = 0;

		switch (sortBy) {
			case "position":
				comparison = a.position - b.position;
				break;
			case "priority": {
				const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
				comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
				break;
			}
			case "dueDate": {
				const aDate = a.dueDate
					? new Date(a.dueDate).getTime()
					: Number.POSITIVE_INFINITY;
				const bDate = b.dueDate
					? new Date(b.dueDate).getTime()
					: Number.POSITIVE_INFINITY;
				comparison = aDate - bDate;
				break;
			}
			case "createdAt":
				comparison =
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				break;
			case "title":
				comparison = a.title.localeCompare(b.title);
				break;
		}

		return sortOrder === "asc" ? comparison : -comparison;
	});

	return sorted;
}
