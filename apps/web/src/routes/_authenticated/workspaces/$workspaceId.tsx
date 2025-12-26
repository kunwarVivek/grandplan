import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Building2,
	Calendar,
	FolderKanban,
	Mail,
	MoreHorizontal,
	Plus,
	Settings,
	Shield,
	UserPlus,
	Users,
} from "lucide-react";

import { ContentContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/workspaces/$workspaceId")(
	{
		component: WorkspaceDetailPage,
		loader: async ({ params }) => {
			// Mock workspace data - replace with actual API call
			const workspace = {
				id: params.workspaceId,
				name: "Engineering",
				description: "All engineering and development projects",
				color: "bg-blue-500",
				isDefault: true,
				createdAt: "2024-06-15",
				projects: [
					{
						id: "1",
						name: "Website Redesign",
						progress: 65,
						status: "active" as const,
					},
					{
						id: "2",
						name: "Mobile App v2",
						progress: 30,
						status: "active" as const,
					},
					{
						id: "3",
						name: "API Integration",
						progress: 45,
						status: "on-hold" as const,
					},
				],
				members: [
					{
						id: "1",
						name: "Sarah Chen",
						email: "sarah@example.com",
						avatar: "",
						initials: "SC",
						role: "Admin",
						joinedAt: "2024-06-15",
					},
					{
						id: "2",
						name: "Alex Rivera",
						email: "alex@example.com",
						avatar: "",
						initials: "AR",
						role: "Editor",
						joinedAt: "2024-07-01",
					},
					{
						id: "3",
						name: "Jordan Kim",
						email: "jordan@example.com",
						avatar: "",
						initials: "JK",
						role: "Editor",
						joinedAt: "2024-07-15",
					},
					{
						id: "4",
						name: "Taylor Morgan",
						email: "taylor@example.com",
						avatar: "",
						initials: "TM",
						role: "Viewer",
						joinedAt: "2024-08-01",
					},
				],
			};
			return { workspace };
		},
	}
);

const roleColors = {
	Admin: "default",
	Editor: "secondary",
	Viewer: "outline",
} as const;

const statusColors = {
	active: "default",
	"on-hold": "secondary",
	completed: "outline",
} as const;

function WorkspaceDetailPage() {
	const { workspace } = Route.useLoaderData();

	return (
		<ContentContainer>
			<PageHeader
				title={workspace.name}
				description={workspace.description}
				breadcrumbs={[
					{ label: "Workspaces", href: "/workspaces" },
					{ label: workspace.name },
				]}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline">
							<UserPlus className="size-4" />
							Invite
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Button variant="outline" size="icon">
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>
									<Settings className="mr-2 size-4" />
									Workspace Settings
								</DropdownMenuItem>
								<DropdownMenuItem>Export Data</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="text-destructive">
									Delete Workspace
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			>
				<div className="flex items-center gap-4">
					<div
						className={`flex size-10 items-center justify-center rounded-md ${workspace.color}`}
					>
						<Building2 className="size-5 text-white" />
					</div>
					{workspace.isDefault && <Badge variant="secondary">Default</Badge>}
					<span className="text-sm text-muted-foreground">
						Created {new Date(workspace.createdAt).toLocaleDateString()}
					</span>
				</div>
			</PageHeader>

			<Tabs defaultValue="projects" className="mt-6">
				<TabsList variant="line">
					<TabsTrigger value="projects">
						<FolderKanban className="mr-1.5 size-4" />
						Projects ({workspace.projects.length})
					</TabsTrigger>
					<TabsTrigger value="members">
						<Users className="mr-1.5 size-4" />
						Members ({workspace.members.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="projects" className="mt-6">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-medium">Projects</h3>
						<Button size="sm">
							<Plus className="size-4" />
							New Project
						</Button>
					</div>
					<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{workspace.projects.map((project) => (
							<Link
								key={project.id}
								to="/projects/$projectId"
								params={{ projectId: project.id }}
							>
								<Card className="transition-colors hover:bg-muted/50">
									<CardHeader className="pb-2">
										<div className="flex items-center justify-between">
											<CardTitle className="text-sm">
												{project.name}
											</CardTitle>
											<Badge variant={statusColors[project.status]}>
												{project.status.replace("-", " ")}
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<div className="flex items-center justify-between text-xs">
												<span className="text-muted-foreground">
													Progress
												</span>
												<span className="font-medium">
													{project.progress}%
												</span>
											</div>
											<Progress value={project.progress} />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
						<Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:bg-muted/50">
							<CardContent className="flex flex-col items-center gap-2 py-8">
								<Plus className="size-8 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									Create Project
								</span>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="members" className="mt-6">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-medium">Members</h3>
						<Button size="sm">
							<UserPlus className="size-4" />
							Invite Member
						</Button>
					</div>
					<div className="mt-4 space-y-2">
						{workspace.members.map((member) => (
							<Card key={member.id}>
								<CardContent className="flex items-center gap-4 p-4">
									<Avatar>
										<AvatarImage src={member.avatar} />
										<AvatarFallback>{member.initials}</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="font-medium">{member.name}</p>
											<Badge variant={roleColors[member.role as keyof typeof roleColors]}>
												{member.role}
											</Badge>
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="flex items-center gap-1">
												<Mail className="size-3" />
												{member.email}
											</span>
											<span className="flex items-center gap-1">
												<Calendar className="size-3" />
												Joined{" "}
												{new Date(member.joinedAt).toLocaleDateString()}
											</span>
										</div>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger>
											<Button variant="ghost" size="icon-sm">
												<MoreHorizontal className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem>
												<Shield className="mr-2 size-4" />
												Change Role
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem className="text-destructive">
												Remove from Workspace
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</ContentContainer>
	);
}
