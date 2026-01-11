import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Settings, Users } from "lucide-react";

import { ContentContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useProject,
	useProjectMembers,
} from "@/features/projects/hooks/use-projects";
import type { ProjectStatus } from "@/features/projects/types";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	component: ProjectLayout,
});

const statusColors: Record<ProjectStatus, "default" | "secondary" | "outline"> =
	{
		planning: "secondary",
		active: "default",
		on_hold: "secondary",
		completed: "outline",
		cancelled: "secondary",
	};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function ProjectLayout() {
	const { projectId } = Route.useParams();
	const { data: project, isLoading, error } = useProject(projectId);
	const { data: membersData } = useProjectMembers(projectId);

	const members = membersData?.members ?? [];

	if (isLoading) {
		return (
			<ContentContainer>
				<div className="flex h-64 items-center justify-center">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</ContentContainer>
		);
	}

	if (error) {
		return (
			<ContentContainer>
				<div className="flex h-64 flex-col items-center justify-center gap-2">
					<p className="text-destructive">Failed to load project</p>
					<p className="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : "Unknown error"}
					</p>
				</div>
			</ContentContainer>
		);
	}

	if (!project) {
		return (
			<ContentContainer>
				<div className="flex h-64 items-center justify-center">
					<p className="text-muted-foreground">Project not found</p>
				</div>
			</ContentContainer>
		);
	}

	return (
		<ContentContainer>
			<PageHeader
				title={project.name}
				description={project.description ?? undefined}
				breadcrumbs={[
					{ label: "Projects", href: "/projects" },
					{ label: project.name },
				]}
				actions={
					<div className="flex items-center gap-2">
						<div className="hidden items-center gap-2 sm:flex">
							<div className="flex -space-x-2">
								{members.slice(0, 3).map((member) => (
									<Avatar key={member.id} size="sm">
										<AvatarImage src={member.user.image ?? undefined} />
										<AvatarFallback>
											{getInitials(member.user.name)}
										</AvatarFallback>
									</Avatar>
								))}
								{members.length > 3 && (
									<div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
										+{members.length - 3}
									</div>
								)}
							</div>
							<Button variant="outline" size="sm">
								<Users className="size-4" />
								Invite
							</Button>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button variant="outline" size="icon" />}
							>
								<MoreHorizontal className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>
									<Settings className="mr-2 size-4" />
									Project Settings
								</DropdownMenuItem>
								<DropdownMenuItem>Duplicate Project</DropdownMenuItem>
								<DropdownMenuItem>Export Data</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>Archive Project</DropdownMenuItem>
								<DropdownMenuItem className="text-destructive">
									Delete Project
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			>
				<div className="flex items-center gap-4">
					<Badge variant={statusColors[project.status]}>
						{project.status.replace("_", " ")}
					</Badge>
					{project.endDate && (
						<span className="text-muted-foreground text-sm">
							Due {new Date(project.endDate).toLocaleDateString()}
						</span>
					)}
				</div>
			</PageHeader>

			{/* Tab Navigation */}
			<Tabs defaultValue="tasks" className="mt-6">
				<TabsList variant="line">
					<TabsTrigger
						value="tasks"
						render={
							<Link
								to="/projects/$projectId"
								params={{ projectId }}
								activeOptions={{ exact: true }}
							/>
						}
					>
						Tasks
					</TabsTrigger>
					<TabsTrigger
						value="settings"
						render={
							<Link
								to="/projects/$projectId"
								params={{ projectId }}
								search={{ tab: "settings" }}
							/>
						}
					>
						Settings
					</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Nested Route Content */}
			<div className="mt-6">
				<Outlet />
			</div>
		</ContentContainer>
	);
}
