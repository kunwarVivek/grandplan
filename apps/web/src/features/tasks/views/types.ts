import type { Task, TaskStatus } from "../types";

export type ViewProps = {
	tasks: Task[];
	onTaskClick: (taskId: string) => void;
	onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
	onTaskCreate: (status?: TaskStatus) => void;
	isLoading?: boolean;
};
