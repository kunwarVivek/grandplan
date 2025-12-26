import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Building2,
	FolderKanban,
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

export const Route = createFileRoute("/_authenticated/workspaces/")({
	component: WorkspacesPage,
});

type Workspace = {
	id: string;
	name: string;
	description: string;
	projectCount: number;
	memberCount: number;
	members: Array<{
		id: string;
		name: string;
		avatar: string;
		initials: string;
	}>;
	color: string;
	isDefault: boolean;
};

const mockWorkspaces: Workspace[] = [
	{
		id: "1",
		name: "Engineering",
		description: "All engineering and development projects",
		projectCount: 8,
		memberCount: 12,
		members: [
			{ id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
			{ id: "2", name: "Alex Rivera", avatar: "", initials: "AR" },
			{ id: "3", name: "Jordan Kim", avatar: "", initials: "JK" },
			{ id: "4", name: "Taylor Morgan", avatar: "", initials: "TM" },
		],
		color: "bg-blue-500",
		isDefault: true,
	},
	{
		id: "2",
		name: "Marketing",
		description: "Marketing campaigns and content projects",
		projectCount: 5,
		memberCount: 6,
		members: [
			{ id: "5", name: "Casey Brooks", avatar: "", initials: "CB" },
			{ id: "6", name: "Morgan Lee", avatar: "", initials: "ML" },
		],
		color: "bg-purple-500",
		isDefault: false,
	},
	{
		id: "3",
		name: "Design",
		description: "UI/UX design and brand projects",
		projectCount: 4,
		memberCount: 4,
		members: [
			{ id: "1", name: "Sarah Chen", avatar: "", initials: "SC" },
			{ id: "7", name: "Riley Park", avatar: "", initials: "RP" },
		],
		color: "bg-pink-500",
		isDefault: false,
	},
	{
		id: "4",
		name: "Operations",
		description: "Internal operations and process improvement",
		projectCount: 3,
		memberCount: 8,
		members: [
			{ id: "8", name: "Jamie Chen", avatar: "", initials: "JC" },
			{ id: "9", name: "Sam Wilson", avatar: "", initials: "SW" },
			{ id: "10", name: "Drew Taylor", avatar: "", initials: "DT" },
		],
		color: "bg-green-500",
		isDefault: false,
	},
];

function WorkspacesPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredWorkspaces = mockWorkspaces.filter(
		(workspace) =>
			workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			workspace.description.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<ContentContainer>
			<PageHeader
				title="Workspaces"
				description="Organize your projects into workspaces for better collaboration."
				actions={
					<Button>
						<Plus className="size-4" />
						New Workspace
					</Button>
				}
			/>

			{/* Search */}
			<div className="mt-6">
				<div className="relative max-w-xs">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search workspaces..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
			</div>

			{/* Workspaces Grid */}
			{filteredWorkspaces.length === 0 ? (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<Building2 className="size-12 text-muted-foreground" />
					<h3 className="mt-4 text-lg font-medium">No workspaces found</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{searchQuery
							? "Try adjusting your search query"
							: "Get started by creating your first workspace"}
					</p>
					{!searchQuery && (
						<Button className="mt-4">
							<Plus className="size-4" />
							Create Workspace
						</Button>
					)}
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredWorkspaces.map((workspace) => (
						<Link
							key={workspace.id}
							to="/workspaces/$workspaceId"
							params={{ workspaceId: workspace.id }}
						>
							<Card className="h-full transition-colors hover:bg-muted/50">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div
												className={`flex size-10 items-center justify-center rounded-md ${workspace.color}`}
											>
												<Building2 className="size-5 text-white" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<CardTitle>{workspace.name}</CardTitle>
													{workspace.isDefault && (
														<Badge variant="secondary">Default</Badge>
													)}
												</div>
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
												<DropdownMenuItem>Edit</DropdownMenuItem>
												<DropdownMenuItem>Manage Members</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem className="text-destructive">
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<CardDescription className="mt-2">
										{workspace.description}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<div className="flex items-center gap-1">
												<FolderKanban className="size-4" />
												{workspace.projectCount} projects
											</div>
											<div className="flex items-center gap-1">
												<Users className="size-4" />
												{workspace.memberCount} members
											</div>
										</div>
									</div>
									<div className="mt-4 flex items-center justify-between">
										<div className="flex -space-x-2">
											{workspace.members.slice(0, 4).map((member) => (
												<Avatar key={member.id} size="sm">
													<AvatarImage src={member.avatar} />
													<AvatarFallback>{member.initials}</AvatarFallback>
												</Avatar>
											))}
											{workspace.memberCount > 4 && (
												<div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
													+{workspace.memberCount - 4}
												</div>
											)}
										</div>
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
