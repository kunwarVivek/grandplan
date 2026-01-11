import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	Building2,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import { useState } from "react";

import { ContentContainer, PageHeader } from "@/components/layout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "@/features/workspaces/hooks/use-workspaces";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/workspaces/")({
	component: WorkspacesPage,
});

// Default color when workspace has no color set
const DEFAULT_WORKSPACE_COLOR = "#3b82f6";

function WorkspacesPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading, isError, error, refetch } = useWorkspaces();

	const workspaces = data?.workspaces ?? [];
	const filteredWorkspaces = workspaces.filter(
		(workspace) =>
			workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(workspace.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
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
					<Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search workspaces..."
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
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<Skeleton className="size-10 rounded-md" />
										<div className="space-y-2">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-3 w-20" />
										</div>
									</div>
								</div>
								<Skeleton className="mt-2 h-4 w-full" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-4 w-24" />
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Error State */}
			{isError && (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<h3 className="mt-4 font-medium text-lg">Failed to load workspaces</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{handleApiError(error)}
					</p>
					<Button className="mt-4" variant="outline" onClick={() => refetch()}>
						Try Again
					</Button>
				</div>
			)}

			{/* Empty State */}
			{!isLoading && !isError && filteredWorkspaces.length === 0 && (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<Building2 className="size-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">No workspaces found</h3>
					<p className="mt-2 text-muted-foreground text-sm">
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
			)}

			{/* Workspaces Grid */}
			{!isLoading && !isError && filteredWorkspaces.length > 0 && (
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
												className="flex size-10 items-center justify-center rounded-md"
												style={{ backgroundColor: workspace.color ?? DEFAULT_WORKSPACE_COLOR }}
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
									{workspace.description && (
										<CardDescription className="mt-2">
											{workspace.description}
										</CardDescription>
									)}
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground text-sm">
										/{workspace.slug}
									</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</ContentContainer>
	);
}
