import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Filter,
	FolderKanban,
	Grid3X3,
	List,
	MoreHorizontal,
	Plus,
	Search,
	Users,
} from "lucide-react";
import { useState } from "react";

import { ContentContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/projects/")({
	component: ProjectsPage,
});

type Project = {
	id: string;
	name: string;
	description: string;
	status: "active" | "on-hold" | "completed" | "archived";
	progress: number;
	tasksCompleted: number;
	totalTasks: number;
	members: Array<{
		id: string;
		name: string;
		avatar: string;
		initials: string;
	}>;
	dueDate: string;
	color: string;
};

const mockProjects: Project[] = [
	{
		id: "1",
		name: "Website Redesign",
		description: "Complete overhaul of the company website with new branding",
		status: "active",
		progress: 65,
		tasksCompleted: 26,
		totalTasks: 40,
		members: [
			{ id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
			{ id: "2", name: "Alex Rivera", avatar: "", initials: "AR" },
			{ id: "3", name: "Jordan Kim", avatar: "", initials: "JK" },
		],
		dueDate: "2025-02-15",
		color: "bg-blue-500",
	},
	{
		id: "2",
		name: "Mobile App v2",
		description: "Second major version of our mobile application",
		status: "active",
		progress: 30,
		tasksCompleted: 12,
		totalTasks: 38,
		members: [
			{ id: "2", name: "Alex Rivera", avatar: "", initials: "AR" },
			{ id: "4", name: "Taylor Morgan", avatar: "", initials: "TM" },
		],
		dueDate: "2025-03-30",
		color: "bg-purple-500",
	},
	{
		id: "3",
		name: "API Integration",
		description: "Third-party API integrations for payment and analytics",
		status: "on-hold",
		progress: 45,
		tasksCompleted: 9,
		totalTasks: 20,
		members: [{ id: "3", name: "Jordan Kim", avatar: "", initials: "JK" }],
		dueDate: "2025-02-28",
		color: "bg-green-500",
	},
	{
		id: "4",
		name: "Documentation Update",
		description: "Update all technical documentation and user guides",
		status: "completed",
		progress: 100,
		tasksCompleted: 15,
		totalTasks: 15,
		members: [{ id: "1", name: "Sarah Chen", avatar: "", initials: "SC" }],
		dueDate: "2025-01-15",
		color: "bg-orange-500",
	},
];

const statusColors: Record<Project["status"], string> = {
	active: "default",
	"on-hold": "secondary",
	completed: "outline",
	archived: "secondary",
};

function ProjectsPage() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredProjects = mockProjects.filter(
		(project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.description.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<ContentContainer>
			<PageHeader
				title="Projects"
				description="Manage and track all your projects in one place."
				actions={
					<Button>
						<Plus className="size-4" />
						New Project
					</Button>
				}
			/>

			{/* Toolbar */}
			<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search projects..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4" />
						Filter
					</Button>
					<div className="flex items-center rounded-md border">
						<Button
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setViewMode("grid")}
						>
							<Grid3X3 className="size-4" />
						</Button>
						<Button
							variant={viewMode === "list" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setViewMode("list")}
						>
							<List className="size-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Projects Grid/List */}
			{filteredProjects.length === 0 ? (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<FolderKanban className="size-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">No projects found</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{searchQuery
							? "Try adjusting your search query"
							: "Get started by creating your first project"}
					</p>
					{!searchQuery && (
						<Button className="mt-4">
							<Plus className="size-4" />
							Create Project
						</Button>
					)}
				</div>
			) : viewMode === "grid" ? (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredProjects.map((project) => (
						<Link
							key={project.id}
							to="/projects/$projectId"
							params={{ projectId: project.id }}
						>
							<Card className="transition-colors hover:bg-muted/50">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-2">
											<div className={`size-3 rounded-full ${project.color}`} />
											<CardTitle className="line-clamp-1">
												{project.name}
											</CardTitle>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={(e) => e.preventDefault()}
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem>Edit</DropdownMenuItem>
												<DropdownMenuItem>Duplicate</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem className="text-destructive">
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<CardDescription className="line-clamp-2">
										{project.description}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<Badge
												variant={
													statusColors[project.status] as
														| "default"
														| "secondary"
														| "outline"
												}
											>
												{project.status.replace("-", " ")}
											</Badge>
											<div className="flex items-center gap-1 text-muted-foreground text-xs">
												<Calendar className="size-3" />
												{new Date(project.dueDate).toLocaleDateString()}
											</div>
										</div>
										<div className="space-y-2">
											<div className="flex items-center justify-between text-xs">
												<span className="text-muted-foreground">Progress</span>
												<span className="font-medium">
													{project.tasksCompleted}/{project.totalTasks} tasks
												</span>
											</div>
											<Progress value={project.progress} />
										</div>
										<div className="flex items-center justify-between">
											<div className="flex -space-x-2">
												{project.members.slice(0, 3).map((member) => (
													<Avatar key={member.id} size="sm">
														<AvatarImage src={member.avatar} />
														<AvatarFallback>{member.initials}</AvatarFallback>
													</Avatar>
												))}
												{project.members.length > 3 && (
													<div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
														+{project.members.length - 3}
													</div>
												)}
											</div>
											<div className="flex items-center gap-1 text-muted-foreground text-xs">
												<Users className="size-3" />
												{project.members.length}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			) : (
				<div className="mt-6 space-y-2">
					{filteredProjects.map((project) => (
						<Link
							key={project.id}
							to="/projects/$projectId"
							params={{ projectId: project.id }}
						>
							<Card className="transition-colors hover:bg-muted/50">
								<CardContent className="flex items-center gap-4 p-4">
									<div
										className={`size-3 shrink-0 rounded-full ${project.color}`}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<h3 className="font-medium">{project.name}</h3>
											<Badge
												variant={
													statusColors[project.status] as
														| "default"
														| "secondary"
														| "outline"
												}
											>
												{project.status.replace("-", " ")}
											</Badge>
										</div>
										<p className="mt-1 line-clamp-1 text-muted-foreground text-sm">
											{project.description}
										</p>
									</div>
									<div className="hidden items-center gap-6 md:flex">
										<div className="w-32">
											<Progress value={project.progress} />
										</div>
										<div className="flex -space-x-2">
											{project.members.slice(0, 3).map((member) => (
												<Avatar key={member.id} size="sm">
													<AvatarImage src={member.avatar} />
													<AvatarFallback>{member.initials}</AvatarFallback>
												</Avatar>
											))}
										</div>
										<div className="text-muted-foreground text-sm">
											{new Date(project.dueDate).toLocaleDateString()}
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={(e) => e.preventDefault()}
									>
										<MoreHorizontal className="size-4" />
									</Button>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</ContentContainer>
	);
}
