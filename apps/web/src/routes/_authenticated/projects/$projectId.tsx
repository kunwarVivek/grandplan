import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { MoreHorizontal, Settings, Users } from "lucide-react";

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

interface ProjectMember {
	id: string;
	name: string;
	avatar: string;
	initials: string;
	role: string;
}

type ProjectStatus = "active" | "on-hold" | "completed" | "archived";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	component: ProjectLayout,
	loader: async ({ params }: { params: { projectId: string } }) => {
		// Mock project data - replace with actual API call
		const project: {
			id: string;
			name: string;
			description: string;
			status: ProjectStatus;
			members: ProjectMember[];
			createdAt: string;
			dueDate: string;
		} = {
			id: params.projectId,
			name: "Website Redesign",
			description:
				"Complete overhaul of the company website with new branding and improved UX",
			status: "active",
			members: [
				{
					id: "1",
					name: "Sarah Chen",
					avatar: "",
					initials: "SC",
					role: "Owner",
				},
				{
					id: "2",
					name: "Alex Rivera",
					avatar: "",
					initials: "AR",
					role: "Editor",
				},
				{
					id: "3",
					name: "Jordan Kim",
					avatar: "",
					initials: "JK",
					role: "Viewer",
				},
			],
			createdAt: "2025-01-01",
			dueDate: "2025-02-15",
		};
		return { project };
	},
});

const statusColors = {
	active: "default",
	"on-hold": "secondary",
	completed: "outline",
	archived: "secondary",
} as const;

function ProjectLayout() {
	const { project } = Route.useLoaderData();
	const { projectId } = Route.useParams();

	return (
		<ContentContainer>
			<PageHeader
				title={project.name}
				description={project.description}
				breadcrumbs={[
					{ label: "Projects", href: "/projects" },
					{ label: project.name },
				]}
				actions={
					<div className="flex items-center gap-2">
						<div className="hidden items-center gap-2 sm:flex">
							<div className="flex -space-x-2">
								{project.members.slice(0, 3).map((member) => (
									<Avatar key={member.id} size="sm">
										<AvatarImage src={member.avatar} />
										<AvatarFallback>{member.initials}</AvatarFallback>
									</Avatar>
								))}
								{project.members.length > 3 && (
									<div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
										+{project.members.length - 3}
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
						{project.status.replace("-", " ")}
					</Badge>
					<span className="text-muted-foreground text-sm">
						Due {new Date(project.dueDate).toLocaleDateString()}
					</span>
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
