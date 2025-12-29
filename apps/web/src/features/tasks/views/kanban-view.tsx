import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	ChevronDown,
	ChevronRight,
	GripVertical,
	MoreHorizontal,
	Plus,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	TASK_PRIORITY_CONFIG as PRIORITY_CONFIG,
	TASK_STATUS_CONFIG as STATUS_CONFIG,
	type Task,
	type TaskStatus,
} from "../types";

// ============================================
// VIEW PROPS TYPE
// ============================================

type ViewProps = {
	tasks: Task[];
	onTaskClick: (taskId: string) => void;
	onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
	onTaskCreate: (status?: TaskStatus) => void;
	isLoading?: boolean;
};

// ============================================
// KANBAN COLUMN DEFINITIONS
// ============================================

const KANBAN_COLUMNS: TaskStatus[] = [
	"backlog",
	"todo",
	"in_progress",
	"in_review",
	"completed",
];

// ============================================
// SORTABLE TASK CARD COMPONENT
// ============================================

interface SortableTaskCardProps {
	task: Task;
	onClick: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const priorityConfig = PRIORITY_CONFIG[task.priority];

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex flex-col gap-2 rounded border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
				isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<button
					{...attributes}
					{...listeners}
					className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
				>
					<GripVertical className="h-4 w-4" />
				</button>
				<button type="button" onClick={onClick} className="flex-1 text-left">
					<h4 className="line-clamp-2 font-medium text-sm leading-tight">
						{task.title}
					</h4>
				</button>
				<Button
					variant="ghost"
					size="icon-xs"
					className="shrink-0 opacity-0 group-hover:opacity-100"
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</div>

			{task.description && (
				<p className="line-clamp-2 text-muted-foreground text-xs">
					{task.description}
				</p>
			)}

			<div className="flex items-center justify-between gap-2">
				<span className={cn("font-medium text-xs", priorityConfig.color)}>
					{priorityConfig.icon} {priorityConfig.label}
				</span>
				{task.assignee && (
					<div className="flex items-center gap-1">
						{task.assignee.avatar ? (
							<img
								src={task.assignee.avatar}
								alt={task.assignee.name}
								className="h-5 w-5 rounded-full"
							/>
						) : (
							<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 font-medium text-primary text-xs">
								{task.assignee.name.charAt(0)}
							</div>
						)}
					</div>
				)}
			</div>

			{task.tags && task.tags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{task.tags.slice(0, 2).map((tag: string) => (
						<span
							key={tag}
							className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
						>
							{tag}
						</span>
					))}
					{task.tags.length > 2 && (
						<span className="text-[10px] text-muted-foreground">
							+{task.tags.length - 2}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

// ============================================
// KANBAN COLUMN COMPONENT
// ============================================

interface KanbanColumnProps {
	status: TaskStatus;
	tasks: Task[];
	onTaskClick: (taskId: string) => void;
	onAddTask: () => void;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

function KanbanColumn({
	status,
	tasks,
	onTaskClick,
	onAddTask,
	isCollapsed,
	onToggleCollapse,
}: KanbanColumnProps) {
	const config = STATUS_CONFIG[status];
	const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

	return (
		<div
			className={cn(
				"flex h-full shrink-0 flex-col rounded border bg-muted/30",
				isCollapsed ? "w-12" : "w-72",
			)}
		>
			{/* Column Header */}
			<div
				className={cn("flex items-center gap-2 border-b p-3", config.bgColor)}
			>
				<button
					type="button"
					onClick={onToggleCollapse}
					className="shrink-0 text-muted-foreground hover:text-foreground"
				>
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</button>
				{!isCollapsed && (
					<>
						<span className={cn("font-medium text-sm", config.color)}>
							{config.label}
						</span>
						<Badge variant="secondary" className="ml-auto">
							{tasks.length}
						</Badge>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onAddTask}
							className="shrink-0"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</>
				)}
			</div>

			{/* Column Content */}
			{!isCollapsed && (
				<div className="flex-1 overflow-y-auto p-2">
					<SortableContext
						items={taskIds}
						strategy={verticalListSortingStrategy}
					>
						<div className="flex flex-col gap-2">
							{tasks.map((task) => (
								<SortableTaskCard
									key={task.id}
									task={task}
									onClick={() => onTaskClick(task.id)}
								/>
							))}
						</div>
					</SortableContext>
					{tasks.length === 0 && (
						<div className="flex h-24 items-center justify-center text-muted-foreground text-xs">
							No tasks
						</div>
					)}
				</div>
			)}

			{/* Collapsed Task Count */}
			{isCollapsed && (
				<div className="flex flex-1 items-center justify-center">
					<span
						className="font-medium text-muted-foreground text-sm"
						style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
					>
						{config.label} ({tasks.length})
					</span>
				</div>
			)}
		</div>
	);
}

// ============================================
// LOADING SKELETON
// ============================================

function KanbanSkeleton() {
	return (
		<div className="flex h-full gap-4 overflow-x-auto p-4">
			{KANBAN_COLUMNS.map((status) => (
				<div key={status} className="flex w-72 shrink-0 flex-col gap-2">
					<Skeleton className="h-12 w-full" />
					<div className="flex flex-col gap-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-24 w-full" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================
// KANBAN VIEW COMPONENT
// ============================================

export function KanbanView({
	tasks,
	onTaskClick,
	onTaskUpdate,
	onTaskCreate,
	isLoading,
}: ViewProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [collapsedColumns, setCollapsedColumns] = useState<Set<TaskStatus>>(
		new Set(),
	);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Group tasks by status
	const tasksByStatus = useMemo(() => {
		const grouped: Record<TaskStatus, Task[]> = {
			backlog: [],
			todo: [],
			in_progress: [],
			in_review: [],
			blocked: [],
			completed: [],
			cancelled: [],
		};
		for (const task of tasks) {
			if (grouped[task.status]) {
				grouped[task.status].push(task);
			}
		}
		return grouped;
	}, [tasks]);

	const activeTask = useMemo(
		() => (activeId ? tasks.find((t) => t.id === activeId) : null),
		[activeId, tasks],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	const handleDragOver = useCallback((_event: DragOverEvent) => {
		// Handle drag over logic if needed for column highlighting
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over) return;

			const activeTaskId = active.id as string;
			const overId = over.id as string;

			// Find which column the task was dropped into
			const activeTask = tasks.find((t) => t.id === activeTaskId);
			if (!activeTask) return;

			// Check if dropped on another task
			const overTask = tasks.find((t) => t.id === overId);
			if (overTask && overTask.status !== activeTask.status) {
				onTaskUpdate(activeTaskId, { status: overTask.status });
			}
		},
		[tasks, onTaskUpdate],
	);

	const toggleColumnCollapse = useCallback((status: TaskStatus) => {
		setCollapsedColumns((prev) => {
			const next = new Set(prev);
			if (next.has(status)) {
				next.delete(status);
			} else {
				next.add(status);
			}
			return next;
		});
	}, []);

	if (isLoading) {
		return <KanbanSkeleton />;
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<ScrollArea className="h-full w-full">
				<div className="flex h-full min-h-[600px] gap-4 p-4">
					{KANBAN_COLUMNS.map((status) => (
						<KanbanColumn
							key={status}
							status={status}
							tasks={tasksByStatus[status]}
							onTaskClick={onTaskClick}
							onAddTask={() => onTaskCreate(status)}
							isCollapsed={collapsedColumns.has(status)}
							onToggleCollapse={() => toggleColumnCollapse(status)}
						/>
					))}
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>

			<DragOverlay>
				{activeTask && (
					<div className="w-72 rounded border bg-card p-3 shadow-lg ring-2 ring-primary">
						<h4 className="line-clamp-2 font-medium text-sm">
							{activeTask.title}
						</h4>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
