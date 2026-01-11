import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarIcon,
	CheckIcon,
	ChevronRightIcon,
	ClockIcon,
	FlagIcon,
	Link2Icon,
	LinkIcon,
	ListTreeIcon,
	Loader2Icon,
	MessageSquareIcon,
	PlusIcon,
	Trash2Icon,
	UserIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTaskDetailState, useUIStore } from "@/stores";
import {
	type DependencyType,
	type TaskDependency,
	useAddDependency,
	useDeleteTask,
	useRemoveDependency,
	useTask,
	useTaskChildren,
	useTaskDependencies,
	useTasks,
	useUpdateTask,
} from "../hooks/use-tasks";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../types";
import { TaskActivityFeed } from "./task-activity-feed";

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = new Date(date);
	return d.toISOString().split("T")[0];
}

type SubtaskItemProps = {
	task: Task;
	onClick: () => void;
};

function SubtaskItem({ task, onClick }: SubtaskItemProps) {
	const isDone = task.status === "completed";

	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-muted/50"
		>
			<div
				className={cn(
					"flex size-4 items-center justify-center rounded-full border",
					isDone ? "border-emerald-500 bg-emerald-500" : "border-border",
				)}
			>
				{isDone && <CheckIcon className="size-2.5 text-white" />}
			</div>
			<span
				className={cn(
					"flex-1 truncate text-xs",
					isDone && "text-muted-foreground line-through",
				)}
			>
				{task.title}
			</span>
			<ChevronRightIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
		</button>
	);
}

// Dependency type configuration
const DEPENDENCY_TYPE_CONFIG: Record<
	DependencyType,
	{ label: string; description: string; icon: React.ReactNode }
> = {
	BLOCKS: {
		label: "Blocks",
		description: "This task blocks another task",
		icon: <ArrowRightIcon className="size-3" />,
	},
	REQUIRED_BY: {
		label: "Required by",
		description: "This task is required by another task",
		icon: <ArrowLeftIcon className="size-3" />,
	},
	RELATED_TO: {
		label: "Related to",
		description: "This task is related to another task",
		icon: <Link2Icon className="size-3" />,
	},
};

// Map API status to frontend TaskStatus
function mapTaskStatus(apiStatus: string): TaskStatus {
	const statusMap: Record<string, TaskStatus> = {
		DRAFT: "backlog",
		PENDING: "todo",
		IN_PROGRESS: "in_progress",
		BLOCKED: "blocked",
		IN_REVIEW: "in_review",
		COMPLETED: "completed",
		CANCELLED: "cancelled",
	};
	return statusMap[apiStatus] || "todo";
}

type DependencyItemProps = {
	dependency: TaskDependency;
	type: "blocking" | "blockedBy" | "related";
	currentTaskId: string;
	projectId: string;
	onNavigate: (taskId: string) => void;
	onRemove: () => void;
	isRemoving: boolean;
};

function DependencyItem({
	dependency,
	type,
	currentTaskId: _currentTaskId,
	onNavigate,
	onRemove,
	isRemoving,
}: DependencyItemProps) {
	// For blocking dependencies, show the target task (toTask)
	// For blockedBy dependencies, show the source task (fromTask)
	const linkedTask =
		type === "blocking" || type === "related"
			? dependency.toTask
			: dependency.fromTask;

	if (!linkedTask) return null;

	const status = mapTaskStatus(linkedTask.status);
	const statusConfig = TASK_STATUS_CONFIG[status];
	const isDone = status === "completed";

	return (
		<div className="group flex items-center gap-2 p-2 transition-colors hover:bg-muted/50">
			<Tooltip>
				<TooltipTrigger
					render={
						<div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" />
					}
				>
					{type === "blocking" && <ArrowRightIcon className="size-3" />}
					{type === "blockedBy" && <ArrowLeftIcon className="size-3" />}
					{type === "related" && <Link2Icon className="size-3" />}
				</TooltipTrigger>
				<TooltipContent side="left" className="text-xs">
					{type === "blocking" && "This task blocks"}
					{type === "blockedBy" && "Blocked by this task"}
					{type === "related" && "Related task"}
				</TooltipContent>
			</Tooltip>

			<button
				type="button"
				onClick={() => onNavigate(linkedTask.id)}
				className="flex flex-1 items-center gap-2 text-left"
			>
				<div
					className={cn(
						"flex size-3 shrink-0 items-center justify-center rounded-full border",
						isDone ? "border-emerald-500 bg-emerald-500" : "border-border",
					)}
				>
					{isDone && <CheckIcon className="size-2 text-white" />}
				</div>
				<span
					className={cn(
						"flex-1 truncate text-xs",
						isDone && "text-muted-foreground line-through",
					)}
				>
					{linkedTask.title}
				</span>
				<Badge
					variant="outline"
					className={cn("shrink-0 text-[9px]", statusConfig.color)}
				>
					{statusConfig.label}
				</Badge>
			</button>

			<Button
				variant="ghost"
				size="icon-xs"
				className="opacity-0 transition-opacity group-hover:opacity-100"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				disabled={isRemoving}
			>
				{isRemoving ? (
					<Loader2Icon className="size-3 animate-spin" />
				) : (
					<XIcon className="size-3" />
				)}
			</Button>
		</div>
	);
}

type AddDependencyDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentTaskId: string;
	projectId: string;
	existingDependencyIds: string[];
};

function AddDependencyDialog({
	open,
	onOpenChange,
	currentTaskId,
	projectId,
	existingDependencyIds,
}: AddDependencyDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedType, setSelectedType] = useState<DependencyType>("BLOCKS");
	const { data: tasksData, isLoading } = useTasks(projectId);
	const addDependency = useAddDependency();

	// Filter out current task and already linked tasks
	const availableTasks = useMemo(() => {
		if (!tasksData?.tasks) return [];
		return tasksData.tasks.filter(
			(t) => t.id !== currentTaskId && !existingDependencyIds.includes(t.id),
		);
	}, [tasksData?.tasks, currentTaskId, existingDependencyIds]);

	// Filter by search query
	const filteredTasks = useMemo(() => {
		if (!searchQuery.trim()) return availableTasks;
		const query = searchQuery.toLowerCase();
		return availableTasks.filter((t) => t.title.toLowerCase().includes(query));
	}, [availableTasks, searchQuery]);

	const handleSelectTask = (task: Task) => {
		addDependency.mutate(
			{
				taskId: currentTaskId,
				toTaskId: task.id,
				type: selectedType,
				projectId,
			},
			{
				onSuccess: () => {
					onOpenChange(false);
					setSearchQuery("");
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md p-0">
				<DialogHeader className="p-4 pb-0">
					<DialogTitle className="text-sm">Add Dependency</DialogTitle>
					<DialogDescription className="text-xs">
						Link this task to another task in the project.
					</DialogDescription>
				</DialogHeader>

				<div className="border-b p-4 pt-2">
					<Label className="mb-2 block text-muted-foreground text-xs">
						Dependency Type
					</Label>
					<Select
						value={selectedType}
						onValueChange={(val) => setSelectedType(val as DependencyType)}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(DEPENDENCY_TYPE_CONFIG).map(([value, config]) => (
								<SelectItem key={value} value={value}>
									<div className="flex items-center gap-2">
										{config.icon}
										<span>{config.label}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="mt-1 text-muted-foreground text-xs">
						{DEPENDENCY_TYPE_CONFIG[selectedType].description}
					</p>
				</div>

				<Command className="border-none">
					<CommandInput
						placeholder="Search tasks..."
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList className="max-h-64">
						{isLoading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2Icon className="size-4 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<CommandEmpty>No tasks found.</CommandEmpty>
								<CommandGroup>
									{filteredTasks.map((task) => {
										const statusConfig = TASK_STATUS_CONFIG[task.status];
										return (
											<CommandItem
												key={task.id}
												value={task.title}
												onSelect={() => handleSelectTask(task)}
												disabled={addDependency.isPending}
												className="cursor-pointer"
											>
												<div className="flex w-full items-center gap-2">
													<span className="flex-1 truncate">{task.title}</span>
													<Badge
														variant="outline"
														className={cn(
															"shrink-0 text-[9px]",
															statusConfig.color,
														)}
													>
														{statusConfig.label}
													</Badge>
												</div>
											</CommandItem>
										);
									})}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>

				{addDependency.isPending && (
					<div className="flex items-center justify-center border-t p-3">
						<Loader2Icon className="mr-2 size-3 animate-spin" />
						<span className="text-muted-foreground text-xs">
							Adding dependency...
						</span>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

type TaskDependenciesSectionProps = {
	taskId: string;
	projectId: string;
	onNavigate: (taskId: string) => void;
};

function TaskDependenciesSection({
	taskId,
	projectId,
	onNavigate,
}: TaskDependenciesSectionProps) {
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const { data: dependencies, isLoading } = useTaskDependencies(taskId);
	const removeDependency = useRemoveDependency();
	const [removingId, setRemovingId] = useState<string | null>(null);

	const handleRemoveDependency = (
		dep: TaskDependency,
		type: "blocking" | "blockedBy" | "related",
	) => {
		setRemovingId(dep.id);

		// Determine the correct parameters based on dependency type
		let fromTaskId: string;
		let toTaskId: string;
		let depType: DependencyType;

		if (type === "blocking") {
			// This task blocks another - fromTaskId is current task
			fromTaskId = taskId;
			toTaskId = dep.toTaskId;
			depType = "BLOCKS";
		} else if (type === "blockedBy") {
			// This task is blocked by another - fromTaskId is the other task
			fromTaskId = dep.fromTaskId;
			toTaskId = taskId;
			depType = "BLOCKS";
		} else {
			// Related - could be either direction
			fromTaskId = dep.fromTaskId;
			toTaskId = dep.toTaskId;
			depType = "RELATED_TO";
		}

		removeDependency.mutate(
			{
				taskId: fromTaskId,
				toTaskId,
				type: depType,
				projectId,
			},
			{
				onSettled: () => {
					setRemovingId(null);
				},
			},
		);
	};

	// Collect all existing dependency task IDs
	const existingDependencyIds = useMemo(() => {
		if (!dependencies) return [];
		const ids = new Set<string>();

		for (const dep of dependencies.blocking) {
			ids.add(dep.toTaskId);
		}
		for (const dep of dependencies.blockedBy) {
			ids.add(dep.fromTaskId);
		}
		for (const dep of dependencies.related) {
			ids.add(dep.fromTaskId === taskId ? dep.toTaskId : dep.fromTaskId);
		}

		return Array.from(ids);
	}, [dependencies, taskId]);

	const totalDependencies =
		(dependencies?.blocking.length ?? 0) +
		(dependencies?.blockedBy.length ?? 0) +
		(dependencies?.related.length ?? 0);

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<LinkIcon className="size-3.5" />
					Dependencies
					{totalDependencies > 0 && (
						<Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
							{totalDependencies}
						</Badge>
					)}
				</Label>
				<Button
					variant="ghost"
					size="xs"
					onClick={() => setIsAddDialogOpen(true)}
				>
					<PlusIcon className="size-3" />
					Add
				</Button>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-4">
					<Loader2Icon className="size-4 animate-spin text-muted-foreground" />
				</div>
			) : totalDependencies > 0 ? (
				<div className="divide-y divide-border rounded-none border border-border">
					{/* Blocking dependencies - tasks this task blocks */}
					{dependencies?.blocking && dependencies.blocking.length > 0 && (
						<div>
							<div className="bg-muted/30 px-2 py-1">
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<ArrowRightIcon className="size-2.5" />
									Blocks ({dependencies.blocking.length})
								</span>
							</div>
							{dependencies.blocking.map((dep) => (
								<DependencyItem
									key={dep.id}
									dependency={dep}
									type="blocking"
									currentTaskId={taskId}
									projectId={projectId}
									onNavigate={onNavigate}
									onRemove={() => handleRemoveDependency(dep, "blocking")}
									isRemoving={removingId === dep.id}
								/>
							))}
						</div>
					)}

					{/* Blocked by dependencies - tasks that block this task */}
					{dependencies?.blockedBy && dependencies.blockedBy.length > 0 && (
						<div>
							<div className="bg-muted/30 px-2 py-1">
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<ArrowLeftIcon className="size-2.5" />
									Blocked by ({dependencies.blockedBy.length})
								</span>
							</div>
							{dependencies.blockedBy.map((dep) => (
								<DependencyItem
									key={dep.id}
									dependency={dep}
									type="blockedBy"
									currentTaskId={taskId}
									projectId={projectId}
									onNavigate={onNavigate}
									onRemove={() => handleRemoveDependency(dep, "blockedBy")}
									isRemoving={removingId === dep.id}
								/>
							))}
						</div>
					)}

					{/* Related dependencies */}
					{dependencies?.related && dependencies.related.length > 0 && (
						<div>
							<div className="bg-muted/30 px-2 py-1">
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<Link2Icon className="size-2.5" />
									Related ({dependencies.related.length})
								</span>
							</div>
							{dependencies.related.map((dep) => (
								<DependencyItem
									key={dep.id}
									dependency={dep}
									type="related"
									currentTaskId={taskId}
									projectId={projectId}
									onNavigate={onNavigate}
									onRemove={() => handleRemoveDependency(dep, "related")}
									isRemoving={removingId === dep.id}
								/>
							))}
						</div>
					)}
				</div>
			) : (
				<p className="py-4 text-center text-muted-foreground text-xs">
					No dependencies
				</p>
			)}

			<AddDependencyDialog
				open={isAddDialogOpen}
				onOpenChange={setIsAddDialogOpen}
				currentTaskId={taskId}
				projectId={projectId}
				existingDependencyIds={existingDependencyIds}
			/>
		</div>
	);
}

export function TaskDetailPanel() {
	const { isOpen, taskId } = useTaskDetailState();
	const closeTaskDetail = useUIStore((state) => state.closeTaskDetail);
	const openTaskDetail = useUIStore((state) => state.openTaskDetail);

	const { data: task, isLoading } = useTask(taskId ?? "");
	const { data: childrenData } = useTaskChildren(taskId ?? "");
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();

	// Local form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<TaskStatus>("todo");
	const [priority, setPriority] = useState<TaskPriority>("low");
	const [dueDate, setDueDate] = useState("");
	const [startDate, setStartDate] = useState("");
	const [estimatedHours, setEstimatedHours] = useState("");
	const [actualHours, setActualHours] = useState("");

	// Sync form state with task data
	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description ?? "");
			setStatus(task.status);
			setPriority(task.priority);
			setDueDate(formatDate(task.dueDate));
			setStartDate(formatDate(task.startDate));
			setEstimatedHours(task.estimatedHours?.toString() ?? "");
			setActualHours(task.actualHours?.toString() ?? "");
		}
	}, [task]);

	const handleSave = () => {
		if (!taskId || !task) return;

		updateTask.mutate({
			taskId,
			projectId: task.projectId,
			title,
			description: description || undefined,
			status,
			priority,
			dueDate: dueDate ? new Date(dueDate) : undefined,
			startDate: startDate ? new Date(startDate) : undefined,
			estimatedHours: estimatedHours
				? Number.parseFloat(estimatedHours)
				: undefined,
			actualHours: actualHours ? Number.parseFloat(actualHours) : undefined,
		});
	};

	const handleDelete = () => {
		if (!taskId || !task) return;

		deleteTask.mutate(
			{
				taskId,
				projectId: task.projectId,
				parentId: task.parentId ?? undefined,
			},
			{
				onSuccess: () => {
					closeTaskDetail();
				},
			},
		);
	};

	const handleStatusChange = (newStatus: TaskStatus) => {
		setStatus(newStatus);
		if (taskId && task) {
			updateTask.mutate({
				taskId,
				projectId: task.projectId,
				status: newStatus,
			});
		}
	};

	const handlePriorityChange = (newPriority: TaskPriority) => {
		setPriority(newPriority);
		if (taskId && task) {
			updateTask.mutate({
				taskId,
				projectId: task.projectId,
				priority: newPriority,
			});
		}
	};

	const subtasks = childrenData?.tasks ?? [];

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && closeTaskDetail()}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-lg"
			>
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : task ? (
					<>
						<SheetHeader className="px-4 pt-4 pb-0">
							<div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
								<Badge
									variant="outline"
									className={cn(
										"text-[10px]",
										TASK_STATUS_CONFIG[status].color,
									)}
								>
									{TASK_STATUS_CONFIG[status].label}
								</Badge>
								{task.parentId && (
									<>
										<span>in</span>
										<button
											type="button"
											className="transition-colors hover:text-foreground"
											onClick={() => openTaskDetail(task.parentId!)}
										>
											Parent Task
										</button>
									</>
								)}
							</div>
							<SheetTitle className="sr-only">Task Details</SheetTitle>
							<SheetDescription className="sr-only">
								Edit task details and manage subtasks
							</SheetDescription>
						</SheetHeader>

						<ScrollArea className="flex-1">
							<div className="space-y-6 p-4">
								{/* Title */}
								<div className="space-y-2">
									<Input
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										onBlur={handleSave}
										placeholder="Task title"
										className="h-auto border-transparent py-2 font-medium text-base hover:border-input focus-visible:border-input"
									/>
								</div>

								{/* Description */}
								<div className="space-y-2">
									<Label className="text-muted-foreground text-xs">
										Description
									</Label>
									<Textarea
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										onBlur={handleSave}
										placeholder="Add a description..."
										className="min-h-24 resize-none"
									/>
								</div>

								<Separator />

								{/* Status & Priority */}
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Status
										</Label>
										<Select
											value={status}
											onValueChange={(val) =>
												val && handleStatusChange(val as TaskStatus)
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(TASK_STATUS_CONFIG).map(
													([value, config]) => (
														<SelectItem key={value} value={value}>
															{config.label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Priority
										</Label>
										<Select
											value={priority}
											onValueChange={(val) =>
												val && handlePriorityChange(val as TaskPriority)
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(TASK_PRIORITY_CONFIG).map(
													([value, config]) => (
														<SelectItem key={value} value={value}>
															<FlagIcon
																className={cn(
																	"mr-1.5 inline-block size-3",
																	value === "none"
																		? "text-muted-foreground"
																		: config.color.split(" ")[1],
																)}
															/>
															{config.label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Assignee */}
								<div className="space-y-2">
									<Label className="text-muted-foreground text-xs">
										Assignee
									</Label>
									<Popover>
										<PopoverTrigger>
											<Button
												variant="outline"
												className="w-full justify-start"
											>
												{task.assignee ? (
													<>
														<Avatar size="sm" className="mr-2">
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
														{task.assignee.name}
													</>
												) : (
													<>
														<UserIcon className="mr-2 size-4 text-muted-foreground" />
														<span className="text-muted-foreground">
															Unassigned
														</span>
													</>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent align="start" className="w-64 p-2">
											<p className="p-2 text-muted-foreground text-xs">
												Assignee selection coming soon...
											</p>
										</PopoverContent>
									</Popover>
								</div>

								{/* Dates */}
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Start Date
										</Label>
										<div className="relative">
											<CalendarIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="date"
												value={startDate}
												onChange={(e) => setStartDate(e.target.value)}
												onBlur={handleSave}
												className="pl-8"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Due Date
										</Label>
										<div className="relative">
											<CalendarIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="date"
												value={dueDate}
												onChange={(e) => setDueDate(e.target.value)}
												onBlur={handleSave}
												className="pl-8"
											/>
										</div>
									</div>
								</div>

								{/* Time tracking */}
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Estimated Hours
										</Label>
										<div className="relative">
											<ClockIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="number"
												min="0"
												step="0.5"
												value={estimatedHours}
												onChange={(e) => setEstimatedHours(e.target.value)}
												onBlur={handleSave}
												placeholder="0"
												className="pl-8"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground text-xs">
											Actual Hours
										</Label>
										<div className="relative">
											<ClockIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="number"
												min="0"
												step="0.5"
												value={actualHours}
												onChange={(e) => setActualHours(e.target.value)}
												onBlur={handleSave}
												placeholder="0"
												className="pl-8"
											/>
										</div>
									</div>
								</div>

								<Separator />

								{/* Subtasks */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
											<ListTreeIcon className="size-3.5" />
											Subtasks
											{subtasks.length > 0 && (
												<Badge
													variant="secondary"
													className="h-4 px-1.5 text-[10px]"
												>
													{subtasks.length}
												</Badge>
											)}
										</Label>
										<Button variant="ghost" size="xs">
											<PlusIcon className="size-3" />
											Add
										</Button>
									</div>

									{subtasks.length > 0 ? (
										<div className="divide-y divide-border rounded-none border border-border">
											{subtasks.map((subtask) => (
												<SubtaskItem
													key={subtask.id}
													task={subtask}
													onClick={() => openTaskDetail(subtask.id)}
												/>
											))}
										</div>
									) : (
										<p className="py-4 text-center text-muted-foreground text-xs">
											No subtasks yet
										</p>
									)}
								</div>

								<Separator />

								{/* Dependencies */}
								<TaskDependenciesSection
									taskId={taskId!}
									projectId={task.projectId}
									onNavigate={openTaskDetail}
								/>

								<Separator />

								{/* Activity/Comments */}
								<div className="space-y-2">
									<Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
										<MessageSquareIcon className="size-3.5" />
										Activity
									</Label>
									<TaskActivityFeed taskId={taskId!} />
								</div>
							</div>
						</ScrollArea>

						<SheetFooter className="border-border border-t px-4 py-3">
							<div className="flex w-full items-center justify-between">
								<AlertDialog>
									<AlertDialogTrigger>
										<Button variant="destructive" size="sm">
											<Trash2Icon className="size-3.5" />
											Delete
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Delete task?</AlertDialogTitle>
											<AlertDialogDescription>
												This will permanently delete "{task.title}" and all its
												subtasks. This action cannot be undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleDelete}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												{deleteTask.isPending ? (
													<Loader2Icon className="size-4 animate-spin" />
												) : (
													"Delete"
												)}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>

								<Button onClick={handleSave} disabled={updateTask.isPending}>
									{updateTask.isPending ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										"Save changes"
									)}
								</Button>
							</div>
						</SheetFooter>
					</>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-muted-foreground text-sm">Task not found</p>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
