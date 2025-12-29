import {
	CalendarIcon,
	CircleCheckIcon,
	CircleDotIcon,
	CopyIcon,
	ExternalLinkIcon,
	FlagIcon,
	MoreHorizontalIcon,
	PencilIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../types";

type TaskCardProps = {
	task: Task;
	isDragging?: boolean;
	onStatusChange?: (status: TaskStatus) => void;
	onPriorityChange?: (priority: TaskPriority) => void;
	onDelete?: () => void;
	onDuplicate?: () => void;
	className?: string;
};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatDueDate(date: Date | string): string {
	const d = new Date(date);
	const now = new Date();
	const diff = d.getTime() - now.getTime();
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

	if (days < 0) return "Overdue";
	if (days === 0) return "Today";
	if (days === 1) return "Tomorrow";
	if (days < 7) return `${days} days`;

	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDueDateOverdue(date: Date | string): boolean {
	return new Date(date) < new Date();
}

export function TaskCard({
	task,
	isDragging,
	onStatusChange,
	onPriorityChange,
	onDelete,
	onDuplicate,
	className,
}: TaskCardProps) {
	const openTaskDetail = useUIStore((state) => state.openTaskDetail);

	const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
	const isOverdue = task.dueDate && isDueDateOverdue(task.dueDate);

	const handleClick = () => {
		openTaskDetail(task.id);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openTaskDetail(task.id);
		}
	};

	const statusOptions = useMemo(
		() =>
			Object.entries(TASK_STATUS_CONFIG).map(([value, config]) => ({
				value: value as TaskStatus,
				label: config.label,
			})),
		[],
	);

	const priorityOptions = useMemo(
		() =>
			Object.entries(TASK_PRIORITY_CONFIG).map(([value, config]) => ({
				value: value as TaskPriority,
				label: config.label,
			})),
		[],
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<div
					role="button"
					tabIndex={0}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
					data-task-id={task.id}
					data-draggable="true"
					data-status={task.status}
					className={cn(
						"group/card cursor-pointer border border-border bg-card p-3 transition-all hover:bg-muted/50",
						"outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
						isDragging && "opacity-50 ring-2 ring-primary",
						className,
					)}
				>
					{/* Header: Priority badge */}
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							{task.priority && (
								<Badge
									variant="outline"
									className={cn("mb-2 text-[10px]", priorityConfig.color)}
								>
									<FlagIcon className="mr-1 size-2.5" />
									{priorityConfig.label}
								</Badge>
							)}

							{/* Title */}
							<h4 className="line-clamp-2 font-medium text-sm leading-tight">
								{task.title}
							</h4>
						</div>

						{/* Quick action button */}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
							}}
							className="p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/card:opacity-100"
						>
							<MoreHorizontalIcon className="size-4" />
						</button>
					</div>

					{/* Footer: Metadata */}
					<div className="mt-3 flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							{/* Due date */}
							{task.dueDate && (
								<span
									className={cn(
										"flex items-center gap-1",
										isOverdue && "text-red-500",
									)}
								>
									<CalendarIcon className="size-3" />
									{formatDueDate(task.dueDate)}
								</span>
							)}

							{/* Child count */}
							{task.childCount > 0 && (
								<span className="flex items-center gap-1">
									<CircleDotIcon className="size-3" />
									{task.childCount}
								</span>
							)}
						</div>

						{/* Assignee */}
						{task.assignee && (
							<Avatar size="sm">
								{task.assignee.avatar ? (
									<AvatarImage
										src={task.assignee.avatar}
										alt={task.assignee.name}
									/>
								) : (
									<AvatarFallback>
										{getInitials(task.assignee.name)}
									</AvatarFallback>
								)}
							</Avatar>
						)}
					</div>
				</div>
			</ContextMenuTrigger>

			<ContextMenuContent className="w-48">
				<ContextMenuItem onClick={handleClick}>
					<ExternalLinkIcon className="size-4" />
					Open
				</ContextMenuItem>
				<ContextMenuItem onClick={handleClick}>
					<PencilIcon className="size-4" />
					Edit
				</ContextMenuItem>
				<ContextMenuSeparator />

				{/* Status submenu */}
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<CircleCheckIcon className="size-4" />
						Set status
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{statusOptions.map((option) => (
							<ContextMenuItem
								key={option.value}
								onClick={() => onStatusChange?.(option.value)}
							>
								{option.label}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Priority submenu */}
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<FlagIcon className="size-4" />
						Set priority
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{priorityOptions.map((option) => (
							<ContextMenuItem
								key={option.value}
								onClick={() => onPriorityChange?.(option.value)}
							>
								{option.label}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Assignee */}
				<ContextMenuItem disabled>
					<UserIcon className="size-4" />
					Assign to...
				</ContextMenuItem>

				<ContextMenuSeparator />
				<ContextMenuItem onClick={onDuplicate}>
					<CopyIcon className="size-4" />
					Duplicate
				</ContextMenuItem>
				<ContextMenuItem variant="destructive" onClick={onDelete}>
					<Trash2Icon className="size-4" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
