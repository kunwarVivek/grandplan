import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	Circle,
	Clock,
	Filter,
	MoreHorizontal,
	Plus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, type TaskStatus } from "@/features/tasks";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
	component: ProjectTasksPage,
});

const columns: { id: TaskStatus; title: string; icon: React.ElementType }[] = [
	{ id: "todo", title: "To Do", icon: Circle },
	{ id: "in_progress", title: "In Progress", icon: Clock },
	{ id: "completed", title: "Done", icon: CheckCircle2 },
];

const priorityColors = {
	urgent: "destructive",
	high: "destructive",
	medium: "outline",
	low: "secondary",
} as const;

function TaskCardSkeleton() {
	return (
		<Card>
			<CardHeader className="p-3 pb-2">
				<Skeleton className="h-4 w-3/4" />
			</CardHeader>
			<CardContent className="p-3 pt-0">
				<Skeleton className="h-3 w-full mb-1" />
				<Skeleton className="h-3 w-2/3 mb-3" />
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-6 w-6 rounded-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function ProjectTasksPage() {
	const { projectId } = Route.useParams();
	const { data, isLoading, error } = useTasks(projectId);

	const tasks = data?.tasks ?? [];

	const getTasksByStatus = (status: TaskStatus) =>
		tasks.filter((task) => task.status === status);

	if (error) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground">
				Failed to load tasks. Please try again.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4" />
						Filter
					</Button>
				</div>
				<Button size="sm">
					<Plus className="size-4" />
					Add Task
				</Button>
			</div>

			{/* Kanban Board */}
			<div className="grid gap-4 md:grid-cols-3">
				{columns.map((column) => {
					const columnTasks = getTasksByStatus(column.id);
					const Icon = column.icon;

					return (
						<div key={column.id} className="space-y-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Icon className="size-4 text-muted-foreground" />
									<h3 className="font-medium">{column.title}</h3>
									{!isLoading && (
										<Badge variant="secondary" className="ml-1">
											{columnTasks.length}
										</Badge>
									)}
								</div>
								<Button variant="ghost" size="icon-sm">
									<Plus className="size-4" />
								</Button>
							</div>
							<div className="space-y-2">
								{isLoading ? (
									<>
										<TaskCardSkeleton />
										<TaskCardSkeleton />
									</>
								) : (
									<>
										{columnTasks.map((task) => (
											<Card
												key={task.id}
												className="cursor-pointer transition-colors hover:bg-muted/50"
											>
												<CardHeader className="p-3 pb-2">
													<div className="flex items-start justify-between gap-2">
														<CardTitle className="font-medium text-sm leading-tight">
															{task.title}
														</CardTitle>
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<Button
																		variant="ghost"
																		size="icon-xs"
																		className="shrink-0"
																	/>
																}
															>
																<MoreHorizontal className="size-3" />
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem>Edit</DropdownMenuItem>
																<DropdownMenuItem>Move to...</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem className="text-destructive">
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</CardHeader>
												<CardContent className="p-3 pt-0">
													<p className="line-clamp-2 text-muted-foreground text-xs">
														{task.description}
													</p>
													<div className="mt-3 flex items-center justify-between">
														<Badge variant={priorityColors[task.priority]}>
															{task.priority}
														</Badge>
														<div className="flex items-center gap-2">
															{task.dueDate && (
																<span className="text-muted-foreground text-xs">
																	{new Date(task.dueDate).toLocaleDateString(
																		undefined,
																		{ month: "short", day: "numeric" },
																	)}
																</span>
															)}
															{task.assignee ? (
																<Avatar size="sm">
																	<AvatarImage
																		src={task.assignee.avatar ?? undefined}
																	/>
																	<AvatarFallback>
																		{getInitials(task.assignee.name)}
																	</AvatarFallback>
																</Avatar>
															) : (
																<div className="flex size-6 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed">
																	<Plus className="size-3 text-muted-foreground" />
																</div>
															)}
														</div>
													</div>
												</CardContent>
											</Card>
										))}
										{columnTasks.length === 0 && (
											<div className="flex h-24 items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
												No tasks
											</div>
										)}
									</>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
