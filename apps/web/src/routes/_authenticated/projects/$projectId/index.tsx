import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	Circle,
	Clock,
	Filter,
	MoreHorizontal,
	Plus,
} from "lucide-react";
import { useState } from "react";

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

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
	component: ProjectTasksPage,
});

type TaskStatus = "todo" | "in-progress" | "done";

type Task = {
	id: string;
	title: string;
	description: string;
	status: TaskStatus;
	priority: "low" | "medium" | "high";
	assignee: {
		id: string;
		name: string;
		avatar: string;
		initials: string;
	} | null;
	dueDate: string | null;
};

const mockTasks: Task[] = [
	{
		id: "1",
		title: "Design homepage mockups",
		description: "Create initial mockups for the new homepage layout",
		status: "done",
		priority: "high",
		assignee: { id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
		dueDate: "2025-01-20",
	},
	{
		id: "2",
		title: "Implement navigation component",
		description: "Build responsive navigation with mobile menu",
		status: "in-progress",
		priority: "high",
		assignee: { id: "2", name: "Alex Rivera", avatar: "", initials: "AR" },
		dueDate: "2025-01-25",
	},
	{
		id: "3",
		title: "Set up authentication",
		description: "Configure auth providers and user sessions",
		status: "in-progress",
		priority: "medium",
		assignee: { id: "3", name: "Jordan Kim", avatar: "", initials: "JK" },
		dueDate: "2025-01-28",
	},
	{
		id: "4",
		title: "Create footer component",
		description: "Design and implement site footer",
		status: "todo",
		priority: "low",
		assignee: null,
		dueDate: "2025-02-01",
	},
	{
		id: "5",
		title: "Write API documentation",
		description: "Document all REST API endpoints",
		status: "todo",
		priority: "medium",
		assignee: { id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
		dueDate: "2025-02-05",
	},
	{
		id: "6",
		title: "Performance optimization",
		description: "Optimize bundle size and loading times",
		status: "todo",
		priority: "high",
		assignee: null,
		dueDate: null,
	},
];

const columns: { id: TaskStatus; title: string; icon: React.ElementType }[] = [
	{ id: "todo", title: "To Do", icon: Circle },
	{ id: "in-progress", title: "In Progress", icon: Clock },
	{ id: "done", title: "Done", icon: CheckCircle2 },
];

const priorityColors = {
	low: "secondary",
	medium: "outline",
	high: "destructive",
} as const;

function ProjectTasksPage() {
	const [tasks] = useState(mockTasks);

	const getTasksByStatus = (status: TaskStatus) =>
		tasks.filter((task) => task.status === status);

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
									<Badge variant="secondary" className="ml-1">
										{columnTasks.length}
									</Badge>
								</div>
								<Button variant="ghost" size="icon-sm">
									<Plus className="size-4" />
								</Button>
							</div>
							<div className="space-y-2">
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
															<AvatarImage src={task.assignee.avatar} />
															<AvatarFallback>
																{task.assignee.initials}
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
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
