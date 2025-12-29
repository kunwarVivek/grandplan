import { createFileRoute, Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search, Shield, Users } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/teams/")({
	component: TeamsPage,
});

type Team = {
	id: string;
	name: string;
	description: string;
	memberCount: number;
	members: Array<{
		id: string;
		name: string;
		avatar: string;
		initials: string;
	}>;
	lead: {
		id: string;
		name: string;
		avatar: string;
		initials: string;
	};
	color: string;
	permissions: string[];
};

const mockTeams: Team[] = [
	{
		id: "1",
		name: "Frontend Team",
		description:
			"Responsible for all client-side development and UI/UX implementation",
		memberCount: 5,
		members: [
			{ id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
			{ id: "2", name: "Alex Rivera", avatar: "", initials: "AR" },
			{ id: "3", name: "Jordan Kim", avatar: "", initials: "JK" },
		],
		lead: { id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
		color: "bg-blue-500",
		permissions: ["projects.edit", "tasks.manage"],
	},
	{
		id: "2",
		name: "Backend Team",
		description:
			"API development, database management, and server infrastructure",
		memberCount: 4,
		members: [
			{ id: "4", name: "Taylor Morgan", avatar: "", initials: "TM" },
			{ id: "5", name: "Casey Brooks", avatar: "", initials: "CB" },
		],
		lead: { id: "4", name: "Taylor Morgan", avatar: "", initials: "TM" },
		color: "bg-green-500",
		permissions: ["projects.edit", "tasks.manage", "settings.view"],
	},
	{
		id: "3",
		name: "Design Team",
		description: "Product design, branding, and user experience",
		memberCount: 3,
		members: [
			{ id: "6", name: "Morgan Lee", avatar: "", initials: "ML" },
			{ id: "7", name: "Riley Park", avatar: "", initials: "RP" },
		],
		lead: { id: "6", name: "Morgan Lee", avatar: "", initials: "ML" },
		color: "bg-purple-500",
		permissions: ["projects.view", "tasks.create"],
	},
	{
		id: "4",
		name: "DevOps",
		description: "CI/CD, infrastructure, and deployment automation",
		memberCount: 2,
		members: [{ id: "8", name: "Jamie Chen", avatar: "", initials: "JC" }],
		lead: { id: "8", name: "Jamie Chen", avatar: "", initials: "JC" },
		color: "bg-orange-500",
		permissions: ["projects.admin", "settings.admin"],
	},
];

function TeamsPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredTeams = mockTeams.filter(
		(team) =>
			team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			team.description.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<ContentContainer>
			<PageHeader
				title="Teams"
				description="Manage your organization's teams and their permissions."
				actions={
					<Button>
						<Plus className="size-4" />
						Create Team
					</Button>
				}
			/>

			{/* Search */}
			<div className="mt-6">
				<div className="relative max-w-xs">
					<Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search teams..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
			</div>

			{/* Teams Grid */}
			{filteredTeams.length === 0 ? (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<Users className="size-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">No teams found</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{searchQuery
							? "Try adjusting your search query"
							: "Get started by creating your first team"}
					</p>
					{!searchQuery && (
						<Button className="mt-4">
							<Plus className="size-4" />
							Create Team
						</Button>
					)}
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredTeams.map((team) => (
						<Link
							key={team.id}
							to="/teams/$teamId"
							params={{ teamId: team.id }}
						>
							<Card className="h-full transition-colors hover:bg-muted/50">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div
												className={`flex size-10 items-center justify-center rounded-md ${team.color}`}
											>
												<Users className="size-5 text-white" />
											</div>
											<div>
												<CardTitle>{team.name}</CardTitle>
												<CardDescription className="flex items-center gap-1 text-xs">
													<Users className="size-3" />
													{team.memberCount} members
												</CardDescription>
											</div>
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
												<DropdownMenuItem>Edit Team</DropdownMenuItem>
												<DropdownMenuItem>Manage Members</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem className="text-destructive">
													Delete Team
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<p className="line-clamp-2 text-muted-foreground text-sm">
										{team.description}
									</p>

									{/* Team Lead */}
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground text-xs">Lead:</span>
										<div className="flex items-center gap-2">
											<Avatar size="sm">
												<AvatarImage src={team.lead.avatar} />
												<AvatarFallback>{team.lead.initials}</AvatarFallback>
											</Avatar>
											<span className="text-sm">{team.lead.name}</span>
										</div>
									</div>

									{/* Members */}
									<div className="flex items-center justify-between">
										<div className="flex -space-x-2">
											{team.members.slice(0, 4).map((member) => (
												<Avatar key={member.id} size="sm">
													<AvatarImage src={member.avatar} />
													<AvatarFallback>{member.initials}</AvatarFallback>
												</Avatar>
											))}
											{team.memberCount > 4 && (
												<div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
													+{team.memberCount - 4}
												</div>
											)}
										</div>
									</div>

									{/* Permissions */}
									<div className="flex flex-wrap gap-1">
										{team.permissions.slice(0, 2).map((permission) => (
											<Badge
												key={permission}
												variant="secondary"
												className="text-xs"
											>
												<Shield className="mr-1 size-3" />
												{permission}
											</Badge>
										))}
										{team.permissions.length > 2 && (
											<Badge variant="secondary" className="text-xs">
												+{team.permissions.length - 2}
											</Badge>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</ContentContainer>
	);
}
