import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	Check,
	Mail,
	MoreHorizontal,
	Settings,
	Shield,
	UserMinus,
	UserPlus,
	Users,
	X,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeam, useTeamMembers } from "@/features/teams/hooks/use-teams";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/teams/$teamId")({
	component: TeamDetailPage,
});

const roleColors = {
	lead: "default",
	member: "secondary",
} as const;

// Default color for teams without a color set
const DEFAULT_TEAM_COLOR = "#3b82f6";

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Mock permissions data - to be replaced with real API when available
const DEFAULT_PERMISSIONS = [
	{
		id: "projects.view",
		name: "View Projects",
		description: "Can view all projects assigned to the team",
		enabled: true,
	},
	{
		id: "projects.edit",
		name: "Edit Projects",
		description: "Can edit project details and settings",
		enabled: true,
	},
	{
		id: "projects.create",
		name: "Create Projects",
		description: "Can create new projects",
		enabled: false,
	},
	{
		id: "tasks.view",
		name: "View Tasks",
		description: "Can view all tasks in assigned projects",
		enabled: true,
	},
	{
		id: "tasks.manage",
		name: "Manage Tasks",
		description: "Can create, edit, and delete tasks",
		enabled: true,
	},
	{
		id: "members.invite",
		name: "Invite Members",
		description: "Can invite new members to the team",
		enabled: false,
	},
	{
		id: "settings.view",
		name: "View Settings",
		description: "Can view team settings",
		enabled: true,
	},
	{
		id: "settings.admin",
		name: "Admin Settings",
		description: "Can modify team settings and permissions",
		enabled: false,
	},
];

function TeamDetailPage() {
	const { teamId } = Route.useParams();
	const {
		data: team,
		isLoading: isLoadingTeam,
		isError: isTeamError,
		error: teamError,
		refetch: refetchTeam,
	} = useTeam(teamId);
	const {
		data: membersData,
		isLoading: isLoadingMembers,
		isError: isMembersError,
		error: membersError,
		refetch: refetchMembers,
	} = useTeamMembers(teamId);

	const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

	const members = membersData?.members ?? [];
	const teamLead = members.find((m) => m.role === "lead");
	const isLoading = isLoadingTeam || isLoadingMembers;
	const isError = isTeamError || isMembersError;
	const error = teamError || membersError;

	const togglePermission = (permissionId: string) => {
		setPermissions((prev) =>
			prev.map((p) =>
				p.id === permissionId ? { ...p, enabled: !p.enabled } : p,
			),
		);
	};

	const handleRefetch = () => {
		refetchTeam();
		refetchMembers();
	};

	// Loading state
	if (isLoading) {
		return (
			<ContentContainer>
				<div className="space-y-6">
					{/* Header skeleton */}
					<div className="space-y-4">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-96" />
						<div className="flex items-center gap-4">
							<Skeleton className="size-10 rounded-md" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
						</div>
					</div>

					{/* Tabs skeleton */}
					<div className="flex gap-4 border-b pb-2">
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-24" />
					</div>

					{/* Members skeleton */}
					<div className="space-y-2">
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
				</div>
			</ContentContainer>
		);
	}

	// Error state
	if (isError) {
		return (
			<ContentContainer>
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<h3 className="mt-4 font-medium text-lg">Failed to load team</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{handleApiError(error)}
					</p>
					<Button variant="outline" className="mt-4" onClick={handleRefetch}>
						Try Again
					</Button>
				</div>
			</ContentContainer>
		);
	}

	// Team not found
	if (!team) {
		return (
			<ContentContainer>
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<Users className="size-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">Team not found</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						The team you're looking for doesn't exist or you don't have access.
					</p>
				</div>
			</ContentContainer>
		);
	}

	const teamColor = team.color || DEFAULT_TEAM_COLOR;

	return (
		<ContentContainer>
			<PageHeader
				title={team.name}
				description={team.description ?? undefined}
				breadcrumbs={[{ label: "Teams", href: "/teams" }, { label: team.name }]}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline">
							<UserPlus className="size-4" />
							Add Member
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
									Team Settings
								</DropdownMenuItem>
								<DropdownMenuItem>Export Data</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="text-destructive">
									Delete Team
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			>
				<div className="flex items-center gap-4">
					<div
						className="flex size-10 items-center justify-center rounded-md"
						style={{ backgroundColor: teamColor }}
					>
						<Users className="size-5 text-white" />
					</div>
					{teamLead && (
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground text-sm">Lead:</span>
							<Avatar size="sm">
								<AvatarImage src={teamLead.user.image ?? undefined} />
								<AvatarFallback>{getInitials(teamLead.user.name)}</AvatarFallback>
							</Avatar>
							<span className="font-medium text-sm">{teamLead.user.name}</span>
						</div>
					)}
					<span className="text-muted-foreground text-sm">
						Created {new Date(team.createdAt).toLocaleDateString()}
					</span>
				</div>
			</PageHeader>

			<Tabs defaultValue="members" className="mt-6">
				<TabsList variant="line">
					<TabsTrigger value="members">
						<Users className="mr-1.5 size-4" />
						Members ({members.length})
					</TabsTrigger>
					<TabsTrigger value="permissions">
						<Shield className="mr-1.5 size-4" />
						Permissions
					</TabsTrigger>
					<TabsTrigger value="settings">
						<Settings className="mr-1.5 size-4" />
						Settings
					</TabsTrigger>
				</TabsList>

				<TabsContent value="members" className="mt-6">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-lg">Team Members</h3>
						<Button size="sm">
							<UserPlus className="size-4" />
							Add Member
						</Button>
					</div>
					{members.length === 0 ? (
						<div className="mt-8 flex flex-col items-center justify-center text-center">
							<Users className="size-12 text-muted-foreground" />
							<h3 className="mt-4 font-medium text-lg">No members yet</h3>
							<p className="mt-2 text-muted-foreground text-sm">
								Add members to get started
							</p>
						</div>
					) : (
						<div className="mt-4 space-y-2">
							{members.map((member) => (
								<Card key={member.id}>
									<CardContent className="flex items-center gap-4 p-4">
										<Avatar>
											<AvatarImage src={member.user.image ?? undefined} />
											<AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="font-medium">{member.user.name}</p>
												<Badge
													variant={
														roleColors[member.role as keyof typeof roleColors]
													}
												>
													{member.role === "lead" ? "Lead" : "Member"}
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
												{member.role !== "lead" && (
													<DropdownMenuItem>
														<Shield className="mr-2 size-4" />
														Make Team Lead
													</DropdownMenuItem>
												)}
												<DropdownMenuSeparator />
												<DropdownMenuItem className="text-destructive">
													<UserMinus className="mr-2 size-4" />
													Remove from Team
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>

				<TabsContent value="permissions" className="mt-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-lg">Team Permissions</h3>
							<p className="text-muted-foreground text-sm">
								Configure what this team can do across the organization
							</p>
						</div>
						<Button size="sm" variant="outline">
							Reset to Defaults
						</Button>
					</div>
					<div className="mt-4 space-y-4">
						{permissions.map((permission) => (
							<Card key={permission.id}>
								<CardContent className="flex items-center justify-between p-4">
									<div className="flex items-center gap-4">
										<div
											className={`flex size-10 items-center justify-center rounded-md ${
												permission.enabled
													? "bg-primary/10 text-primary"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{permission.enabled ? (
												<Check className="size-5" />
											) : (
												<X className="size-5" />
											)}
										</div>
										<div>
											<p className="font-medium">{permission.name}</p>
											<p className="text-muted-foreground text-sm">
												{permission.description}
											</p>
										</div>
									</div>
									<Switch
										checked={permission.enabled}
										onCheckedChange={() => togglePermission(permission.id)}
									/>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="settings" className="mt-6">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Team Information</CardTitle>
								<CardDescription>
									Basic information about this team
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<label className="font-medium text-sm">Team Name</label>
									<p className="mt-1 text-muted-foreground text-sm">
										{team.name}
									</p>
								</div>
								<div>
									<label className="font-medium text-sm">Description</label>
									<p className="mt-1 text-muted-foreground text-sm">
										{team.description || "No description"}
									</p>
								</div>
								<div>
									<label className="font-medium text-sm">Team Lead</label>
									{teamLead ? (
										<div className="mt-1 flex items-center gap-2">
											<Avatar size="sm">
												<AvatarImage src={teamLead.user.image ?? undefined} />
												<AvatarFallback>{getInitials(teamLead.user.name)}</AvatarFallback>
											</Avatar>
											<span className="text-sm">{teamLead.user.name}</span>
										</div>
									) : (
										<p className="mt-1 text-muted-foreground text-sm">
											No lead assigned
										</p>
									)}
								</div>
								<Button variant="outline">Edit Team Details</Button>
							</CardContent>
						</Card>

						<Card className="border-destructive">
							<CardHeader>
								<CardTitle className="text-destructive">Danger Zone</CardTitle>
								<CardDescription>
									Irreversible actions for this team
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">Archive Team</p>
										<p className="text-muted-foreground text-sm">
											Archive this team and remove all members
										</p>
									</div>
									<Button variant="outline">Archive</Button>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">Delete Team</p>
										<p className="text-muted-foreground text-sm">
											Permanently delete this team and all associated data
										</p>
									</div>
									<Button variant="destructive">Delete</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</ContentContainer>
	);
}
