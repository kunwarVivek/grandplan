import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore, useTaskDetailState } from "@/stores";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	CalendarIcon,
	CheckIcon,
	ChevronRightIcon,
	ClockIcon,
	FlagIcon,
	LinkIcon,
	ListTreeIcon,
	Loader2Icon,
	MessageSquareIcon,
	PlusIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import { useTask, useUpdateTask, useDeleteTask, useTaskChildren } from "../hooks/use-tasks";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../types";

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
			className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 transition-colors group"
		>
			<div
				className={cn(
					"size-4 rounded-full border flex items-center justify-center",
					isDone ? "bg-emerald-500 border-emerald-500" : "border-border",
				)}
			>
				{isDone && <CheckIcon className="size-2.5 text-white" />}
			</div>
			<span
				className={cn("flex-1 text-xs truncate", isDone && "text-muted-foreground line-through")}
			>
				{task.title}
			</span>
			<ChevronRightIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
		</button>
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
			title,
			description: description || undefined,
			status,
			priority,
			dueDate: dueDate ? new Date(dueDate) : undefined,
			startDate: startDate ? new Date(startDate) : undefined,
			estimatedHours: estimatedHours ? Number.parseFloat(estimatedHours) : undefined,
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
		if (taskId) {
			updateTask.mutate({ taskId, status: newStatus });
		}
	};

	const handlePriorityChange = (newPriority: TaskPriority) => {
		setPriority(newPriority);
		if (taskId) {
			updateTask.mutate({ taskId, priority: newPriority });
		}
	};

	const subtasks = childrenData?.tasks ?? [];

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && closeTaskDetail()}>
			<SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
				{isLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : task ? (
					<>
						<SheetHeader className="px-4 pt-4 pb-0">
							<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
								<Badge variant="outline" className={cn("text-[10px]", TASK_STATUS_CONFIG[status].color)}>
									{TASK_STATUS_CONFIG[status].label}
								</Badge>
								{task.parentId && (
									<>
										<span>in</span>
										<button
											type="button"
											className="hover:text-foreground transition-colors"
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
							<div className="p-4 space-y-6">
								{/* Title */}
								<div className="space-y-2">
									<Input
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										onBlur={handleSave}
										placeholder="Task title"
										className="text-base font-medium h-auto py-2 border-transparent hover:border-input focus-visible:border-input"
									/>
								</div>

								{/* Description */}
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground">Description</Label>
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
										<Label className="text-xs text-muted-foreground">Status</Label>
										<Select value={status} onValueChange={(val) => val && handleStatusChange(val as TaskStatus)}>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(TASK_STATUS_CONFIG).map(([value, config]) => (
													<SelectItem key={value} value={value}>
														{config.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label className="text-xs text-muted-foreground">Priority</Label>
										<Select value={priority} onValueChange={(val) => val && handlePriorityChange(val as TaskPriority)}>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(TASK_PRIORITY_CONFIG).map(([value, config]) => (
													<SelectItem key={value} value={value}>
														<FlagIcon
															className={cn(
																"size-3 mr-1.5 inline-block",
																value === "none" ? "text-muted-foreground" : config.color.split(" ")[1],
															)}
														/>
														{config.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Assignee */}
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground">Assignee</Label>
									<Popover>
										<PopoverTrigger>
											<Button variant="outline" className="w-full justify-start">
												{task.assignee ? (
													<>
														<Avatar size="sm" className="mr-2">
															{task.assignee.avatar ? (
																<AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
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
														<UserIcon className="size-4 mr-2 text-muted-foreground" />
														<span className="text-muted-foreground">Unassigned</span>
													</>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent align="start" className="w-64 p-2">
											<p className="text-xs text-muted-foreground p-2">
												Assignee selection coming soon...
											</p>
										</PopoverContent>
									</Popover>
								</div>

								{/* Dates */}
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-xs text-muted-foreground">Start Date</Label>
										<div className="relative">
											<CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
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
										<Label className="text-xs text-muted-foreground">Due Date</Label>
										<div className="relative">
											<CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
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
										<Label className="text-xs text-muted-foreground">Estimated Hours</Label>
										<div className="relative">
											<ClockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
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
										<Label className="text-xs text-muted-foreground">Actual Hours</Label>
										<div className="relative">
											<ClockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
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
										<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
											<ListTreeIcon className="size-3.5" />
											Subtasks
											{subtasks.length > 0 && (
												<Badge variant="secondary" className="text-[10px] h-4 px-1.5">
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
										<div className="border border-border rounded-none divide-y divide-border">
											{subtasks.map((subtask) => (
												<SubtaskItem
													key={subtask.id}
													task={subtask}
													onClick={() => openTaskDetail(subtask.id)}
												/>
											))}
										</div>
									) : (
										<p className="text-xs text-muted-foreground py-4 text-center">
											No subtasks yet
										</p>
									)}
								</div>

								<Separator />

								{/* Dependencies placeholder */}
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
										<LinkIcon className="size-3.5" />
										Dependencies
									</Label>
									<p className="text-xs text-muted-foreground py-4 text-center">
										Dependencies coming soon...
									</p>
								</div>

								<Separator />

								{/* Activity/Comments placeholder */}
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
										<MessageSquareIcon className="size-3.5" />
										Activity
									</Label>
									<p className="text-xs text-muted-foreground py-4 text-center">
										Activity feed coming soon...
									</p>
								</div>
							</div>
						</ScrollArea>

						<SheetFooter className="border-t border-border px-4 py-3">
							<div className="flex items-center justify-between w-full">
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
												This will permanently delete "{task.title}" and all its subtasks. This
												action cannot be undone.
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
					<div className="flex-1 flex items-center justify-center">
						<p className="text-muted-foreground text-sm">Task not found</p>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
