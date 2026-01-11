import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { useState } from "react";

import { ContentContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams } from "@/features/teams/hooks/use-teams";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/teams/")({
	component: TeamsPage,
});

// Default colors for teams without a color set
const DEFAULT_TEAM_COLORS = [
	"#3b82f6", // blue
	"#22c55e", // green
	"#a855f7", // purple
	"#f97316", // orange
	"#ef4444", // red
	"#14b8a6", // teal
];

function getTeamColor(color: string | null | undefined, index: number): string {
	if (color) return color;
	return DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function TeamsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const { data, isLoading, isError, error, refetch } = useTeams();

	const teams = data?.teams ?? [];

	const filteredTeams = teams.filter(
		(team) =>
			team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
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

			{/* Loading State */}
			{isLoading && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i} className="h-full">
							<CardHeader>
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-md" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-5 w-32" />
										<Skeleton className="h-3 w-20" />
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
								<div className="flex -space-x-2">
									{Array.from({ length: 3 }).map((_, j) => (
										<Skeleton key={j} className="size-6 rounded-full" />
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Error State */}
			{isError && (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<h3 className="mt-4 font-medium text-lg">Failed to load teams</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{handleApiError(error)}
					</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						Try Again
					</Button>
				</div>
			)}

			{/* Empty State */}
			{!isLoading && !isError && filteredTeams.length === 0 && (
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
			)}

			{/* Teams Grid */}
			{!isLoading && !isError && filteredTeams.length > 0 && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredTeams.map((team, index) => (
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
												className="flex size-10 items-center justify-center rounded-md"
												style={{ backgroundColor: getTeamColor(team.color, index) }}
											>
												<Users className="size-5 text-white" />
											</div>
											<div>
												<CardTitle>{team.name}</CardTitle>
												<CardDescription className="text-xs">
													/{team.slug}
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
									{team.description && (
										<p className="line-clamp-2 text-muted-foreground text-sm">
											{team.description}
										</p>
									)}

									{/* Team Icon Placeholder */}
									<div className="flex items-center gap-2">
										<Avatar size="sm">
											<AvatarFallback>{getInitials(team.name)}</AvatarFallback>
										</Avatar>
										<span className="text-muted-foreground text-xs">
											View team details
										</span>
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
