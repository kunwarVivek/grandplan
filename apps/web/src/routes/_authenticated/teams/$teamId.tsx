import { createFileRoute } from "@tanstack/react-router";
import {
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/teams/$teamId")({
	component: TeamDetailPage,
	loader: async ({ params }) => {
		// Mock team data - replace with actual API call
		const team = {
			id: params.teamId,
			name: "Frontend Team",
			description:
				"Responsible for all client-side development and UI/UX implementation",
			color: "bg-blue-500",
			createdAt: "2024-06-15",
			lead: {
				id: "1",
				name: "Sarah Chen",
				email: "sarah@example.com",
				avatar: "",
				initials: "SC",
			},
			members: [
				{
					id: "1",
					name: "Sarah Chen",
					email: "sarah@example.com",
					avatar: "",
					initials: "SC",
					role: "Lead",
					joinedAt: "2024-06-15",
				},
				{
					id: "2",
					name: "Alex Rivera",
					email: "alex@example.com",
					avatar: "",
					initials: "AR",
					role: "Member",
					joinedAt: "2024-07-01",
				},
				{
					id: "3",
					name: "Jordan Kim",
					email: "jordan@example.com",
					avatar: "",
					initials: "JK",
					role: "Member",
					joinedAt: "2024-07-15",
				},
				{
					id: "4",
					name: "Taylor Morgan",
					email: "taylor@example.com",
					avatar: "",
					initials: "TM",
					role: "Member",
					joinedAt: "2024-08-01",
				},
				{
					id: "5",
					name: "Casey Brooks",
					email: "casey@example.com",
					avatar: "",
					initials: "CB",
					role: "Member",
					joinedAt: "2024-08-15",
				},
			],
			permissions: [
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
			],
		};
		return { team };
	},
});

const roleColors = {
	Lead: "default",
	Member: "secondary",
} as const;

function TeamDetailPage() {
	const { team } = Route.useLoaderData();
	const [permissions, setPermissions] = useState(team.permissions);

	const togglePermission = (permissionId: string) => {
		setPermissions((prev) =>
			prev.map((p) =>
				p.id === permissionId ? { ...p, enabled: !p.enabled } : p
			)
		);
	};

	return (
		<ContentContainer>
			<PageHeader
				title={team.name}
				description={team.description}
				breadcrumbs={[
					{ label: "Teams", href: "/teams" },
					{ label: team.name },
				]}
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
						className={`flex size-10 items-center justify-center rounded-md ${team.color}`}
					>
						<Users className="size-5 text-white" />
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Lead:</span>
						<Avatar size="sm">
							<AvatarImage src={team.lead.avatar} />
							<AvatarFallback>{team.lead.initials}</AvatarFallback>
						</Avatar>
						<span className="text-sm font-medium">{team.lead.name}</span>
					</div>
					<span className="text-sm text-muted-foreground">
						Created {new Date(team.createdAt).toLocaleDateString()}
					</span>
				</div>
			</PageHeader>

			<Tabs defaultValue="members" className="mt-6">
				<TabsList variant="line">
					<TabsTrigger value="members">
						<Users className="mr-1.5 size-4" />
						Members ({team.members.length})
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
						<h3 className="text-lg font-medium">Team Members</h3>
						<Button size="sm">
							<UserPlus className="size-4" />
							Add Member
						</Button>
					</div>
					<div className="mt-4 space-y-2">
						{team.members.map((member) => (
							<Card key={member.id}>
								<CardContent className="flex items-center gap-4 p-4">
									<Avatar>
										<AvatarImage src={member.avatar} />
										<AvatarFallback>{member.initials}</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="font-medium">{member.name}</p>
											<Badge
												variant={
													roleColors[member.role as keyof typeof roleColors]
												}
											>
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
											{member.role !== "Lead" && (
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
				</TabsContent>

				<TabsContent value="permissions" className="mt-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-medium">Team Permissions</h3>
							<p className="text-sm text-muted-foreground">
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
											<p className="text-sm text-muted-foreground">
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
									<label className="text-sm font-medium">Team Name</label>
									<p className="mt-1 text-sm text-muted-foreground">
										{team.name}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium">Description</label>
									<p className="mt-1 text-sm text-muted-foreground">
										{team.description}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium">Team Lead</label>
									<div className="mt-1 flex items-center gap-2">
										<Avatar size="sm">
											<AvatarImage src={team.lead.avatar} />
											<AvatarFallback>{team.lead.initials}</AvatarFallback>
										</Avatar>
										<span className="text-sm">{team.lead.name}</span>
									</div>
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
										<p className="text-sm text-muted-foreground">
											Archive this team and remove all members
										</p>
									</div>
									<Button variant="outline">Archive</Button>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">Delete Team</p>
										<p className="text-sm text-muted-foreground">
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
