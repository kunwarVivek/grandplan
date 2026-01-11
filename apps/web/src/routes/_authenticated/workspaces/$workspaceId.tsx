import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { PROJECT_STATUS_CONFIG } from "@/features/projects/types";
import {
	useWorkspace,
	useWorkspaceMembers,
} from "@/features/workspaces/hooks/use-workspaces";
import { WORKSPACE_ROLE_CONFIG } from "@/features/workspaces/types";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/workspaces/$workspaceId")(
	{
		component: WorkspaceDetailPage,
	},
);

// Default color when workspace has no color set
const DEFAULT_WORKSPACE_COLOR = "#3b82f6";

// Map workspace roles to badge variants
const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
	owner: "default",
	admin: "default",
	member: "secondary",
	viewer: "outline",
};

// Map project status to badge variants
const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
	active: "default",
	planning: "secondary",
	on_hold: "outline",
	completed: "outline",
	cancelled: "destructive",
};

// Helper to get initials from a name
function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function WorkspaceDetailPage() {
	const { workspaceId } = Route.useParams();

	// Fetch workspace data
	const {
		data: workspace,
		isLoading: isWorkspaceLoading,
		isError: isWorkspaceError,
		error: workspaceError,
		refetch: refetchWorkspace,
	} = useWorkspace(workspaceId);

	// Fetch workspace members
	const {
		data: membersData,
		isLoading: isMembersLoading,
		isError: isMembersError,
	} = useWorkspaceMembers(workspaceId);

	// Fetch workspace projects
	const {
		data: projectsData,
		isLoading: isProjectsLoading,
		isError: isProjectsError,
	} = useProjects(workspaceId);

	const members = membersData?.members ?? [];
	const projects = projectsData?.projects ?? [];

	const isLoading = isWorkspaceLoading;
	const isError = isWorkspaceError;

	// Loading state
	if (isLoading) {
		return (
			<ContentContainer>
				<div className="space-y-6">
					<div className="space-y-4">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-96" />
						<div className="flex items-center gap-4">
							<Skeleton className="size-10 rounded-md" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
					<div className="space-y-4">
						<Skeleton className="h-10 w-64" />
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Card key={i}>
									<CardHeader className="pb-2">
										<Skeleton className="h-5 w-32" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-4 w-full" />
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</div>
			</ContentContainer>
		);
	}

	// Error state
	if (isError || !workspace) {
		return (
			<ContentContainer>
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<h3 className="mt-4 font-medium text-lg">Failed to load workspace</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{workspaceError ? handleApiError(workspaceError) : "Workspace not found"}
					</p>
					<Button className="mt-4" variant="outline" onClick={() => refetchWorkspace()}>
						Try Again
					</Button>
				</div>
			</ContentContainer>
		);
	}

	return (
		<ContentContainer>
			<PageHeader
				title={workspace.name}
				description={workspace.description ?? undefined}
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
						className="flex size-10 items-center justify-center rounded-md"
						style={{ backgroundColor: workspace.color ?? DEFAULT_WORKSPACE_COLOR }}
					>
						<Building2 className="size-5 text-white" />
					</div>
					{workspace.isDefault && <Badge variant="secondary">Default</Badge>}
					<span className="text-muted-foreground text-sm">
						Created {new Date(workspace.createdAt).toLocaleDateString()}
					</span>
				</div>
			</PageHeader>

			<Tabs defaultValue="projects" className="mt-6">
				<TabsList variant="line">
					<TabsTrigger value="projects">
						<FolderKanban className="mr-1.5 size-4" />
						Projects ({isProjectsLoading ? "..." : projects.length})
					</TabsTrigger>
					<TabsTrigger value="members">
						<Users className="mr-1.5 size-4" />
						Members ({isMembersLoading ? "..." : members.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="projects" className="mt-6">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-lg">Projects</h3>
						<Button size="sm">
							<Plus className="size-4" />
							New Project
						</Button>
					</div>

					{/* Projects Loading State */}
					{isProjectsLoading && (
						<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Card key={i}>
									<CardHeader className="pb-2">
										<Skeleton className="h-5 w-32" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-4 w-full" />
									</CardContent>
								</Card>
							))}
						</div>
					)}

					{/* Projects Error State */}
					{isProjectsError && (
						<div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
							<AlertTriangle className="size-8 text-destructive" />
							<p className="mt-2 text-muted-foreground text-sm">
								Failed to load projects
							</p>
						</div>
					)}

					{/* Projects Content */}
					{!isProjectsLoading && !isProjectsError && (
						<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{projects.map((project) => {
								const statusConfig = PROJECT_STATUS_CONFIG[project.status];
								return (
									<Link
										key={project.id}
										to="/projects/$projectId"
										params={{ projectId: project.id }}
									>
										<Card className="transition-colors hover:bg-muted/50">
											<CardHeader className="pb-2">
												<div className="flex items-center justify-between">
													<CardTitle className="text-sm">{project.name}</CardTitle>
													<Badge variant={statusVariants[project.status] ?? "secondary"}>
														{statusConfig?.label ?? project.status}
													</Badge>
												</div>
											</CardHeader>
											<CardContent>
												{project.description ? (
													<p className="line-clamp-2 text-muted-foreground text-sm">
														{project.description}
													</p>
												) : (
													<p className="text-muted-foreground text-sm italic">
														No description
													</p>
												)}
											</CardContent>
										</Card>
									</Link>
								);
							})}
							<Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:bg-muted/50">
								<CardContent className="flex flex-col items-center gap-2 py-8">
									<Plus className="size-8 text-muted-foreground" />
									<span className="text-muted-foreground text-sm">
										Create Project
									</span>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Empty State */}
					{!isProjectsLoading && !isProjectsError && projects.length === 0 && (
						<div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
							<FolderKanban className="size-12 text-muted-foreground" />
							<h3 className="mt-4 font-medium text-lg">No projects yet</h3>
							<p className="mt-2 text-muted-foreground text-sm">
								Get started by creating your first project in this workspace
							</p>
							<Button className="mt-4" size="sm">
								<Plus className="size-4" />
								Create Project
							</Button>
						</div>
					)}
				</TabsContent>

				<TabsContent value="members" className="mt-6">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-lg">Members</h3>
						<Button size="sm">
							<UserPlus className="size-4" />
							Invite Member
						</Button>
					</div>

					{/* Members Loading State */}
					{isMembersLoading && (
						<div className="mt-4 space-y-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<Card key={i}>
									<CardContent className="flex items-center gap-4 p-4">
										<Skeleton className="size-10 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-48" />
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}

					{/* Members Error State */}
					{isMembersError && (
						<div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
							<AlertTriangle className="size-8 text-destructive" />
							<p className="mt-2 text-muted-foreground text-sm">
								Failed to load members
							</p>
						</div>
					)}

					{/* Members Content */}
					{!isMembersLoading && !isMembersError && (
						<div className="mt-4 space-y-2">
							{members.map((member) => {
								const roleConfig = WORKSPACE_ROLE_CONFIG[member.role];
								return (
									<Card key={member.id}>
										<CardContent className="flex items-center gap-4 p-4">
											<Avatar>
												<AvatarImage src={member.user.image ?? undefined} />
												<AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<p className="font-medium">{member.user.name}</p>
													<Badge variant={roleVariants[member.role] ?? "secondary"}>
														{roleConfig?.label ?? member.role}
													</Badge>
												</div>
												<div className="flex items-center gap-4 text-muted-foreground text-sm">
													<span className="flex items-center gap-1">
														<Mail className="size-3" />
														{member.user.email}
													</span>
													<span className="flex items-center gap-1">
														<Calendar className="size-3" />
														Joined {new Date(member.createdAt).toLocaleDateString()}
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
								);
							})}
						</div>
					)}

					{/* Empty State */}
					{!isMembersLoading && !isMembersError && members.length === 0 && (
						<div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
							<Users className="size-12 text-muted-foreground" />
							<h3 className="mt-4 font-medium text-lg">No members yet</h3>
							<p className="mt-2 text-muted-foreground text-sm">
								Invite team members to collaborate in this workspace
							</p>
							<Button className="mt-4" size="sm">
								<UserPlus className="size-4" />
								Invite Member
							</Button>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</ContentContainer>
	);
}
