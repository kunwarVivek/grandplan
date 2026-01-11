import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Filter,
	FolderKanban,
	Grid3X3,
	List,
	MoreHorizontal,
	Plus,
	RefreshCw,
	Search,
	XCircle,
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
import {
	PROJECT_STATUS_CONFIG,
	useProjects,
	type ProjectStatus,
} from "@/features/projects";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/projects/")({
	component: ProjectsPage,
});

const statusBadgeVariants: Record<ProjectStatus, "default" | "secondary" | "outline"> = {
	planning: "secondary",
	active: "default",
	on_hold: "secondary",
	completed: "outline",
	cancelled: "secondary",
};

function ProjectsPage() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading, isError, error, refetch } = useProjects();

	const projects = data?.projects ?? [];

	const filteredProjects = projects.filter(
		(project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
	);

	// Helper to format date
	function formatDate(date: Date | string | null | undefined): string {
		if (!date) return "No due date";
		const d = typeof date === "string" ? new Date(date) : date;
		return d.toLocaleDateString();
	}

	// Loading skeleton for grid view
	function renderGridSkeleton() {
		return (
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-2">
									<Skeleton className="size-3 rounded-full" />
									<Skeleton className="h-5 w-32" />
								</div>
								<Skeleton className="size-8" />
							</div>
							<Skeleton className="mt-2 h-4 w-full" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<Skeleton className="h-5 w-16" />
									<Skeleton className="h-4 w-20" />
								</div>
								<Skeleton className="h-2 w-full" />
								<div className="flex items-center justify-between">
									<Skeleton className="h-6 w-20" />
									<Skeleton className="h-4 w-8" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<ContentContainer>
				<PageHeader
					title="Projects"
					description="Manage and track all your projects in one place."
				/>
				<Card className="mt-6">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<XCircle className="mb-4 size-12 text-destructive" />
						<h3 className="mb-2 font-medium text-lg">Failed to load projects</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							{handleApiError(error)}
						</p>
						<Button onClick={() => refetch()}>
							<RefreshCw className="size-4" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			</ContentContainer>
		);
	}

	return (
		<ContentContainer>
			<PageHeader
				title="Projects"
				description="Manage and track all your projects in one place."
				actions={
					<Button>
						<Plus className="size-4" />
						New Project
					</Button>
				}
			/>

			{/* Toolbar */}
			<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search projects..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4" />
						Filter
					</Button>
					<div className="flex items-center rounded-md border">
						<Button
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setViewMode("grid")}
						>
							<Grid3X3 className="size-4" />
						</Button>
						<Button
							variant={viewMode === "list" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setViewMode("list")}
						>
							<List className="size-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Projects Grid/List */}
			{isLoading ? (
				renderGridSkeleton()
			) : filteredProjects.length === 0 ? (
				<div className="mt-12 flex flex-col items-center justify-center text-center">
					<FolderKanban className="size-12 text-muted-foreground" />
					<h3 className="mt-4 font-medium text-lg">No projects found</h3>
					<p className="mt-2 text-muted-foreground text-sm">
						{searchQuery
							? "Try adjusting your search query"
							: "Get started by creating your first project"}
					</p>
					{!searchQuery && (
						<Button className="mt-4">
							<Plus className="size-4" />
							Create Project
						</Button>
					)}
				</div>
			) : viewMode === "grid" ? (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredProjects.map((project) => (
						<Link
							key={project.id}
							to="/projects/$projectId"
							params={{ projectId: project.id }}
						>
							<Card className="transition-colors hover:bg-muted/50">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-2">
											<div
												className="size-3 rounded-full"
												style={{ backgroundColor: project.color || "#6b7280" }}
											/>
											<CardTitle className="line-clamp-1">
												{project.name}
											</CardTitle>
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
												<DropdownMenuItem>Duplicate</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem className="text-destructive">
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<CardDescription className="line-clamp-2">
										{project.description || "No description"}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<Badge variant={statusBadgeVariants[project.status]}>
												{PROJECT_STATUS_CONFIG[project.status].label}
											</Badge>
											{project.endDate && (
												<div className="flex items-center gap-1 text-muted-foreground text-xs">
													<Calendar className="size-3" />
													{formatDate(project.endDate)}
												</div>
											)}
										</div>
										<div className="flex items-center justify-between text-muted-foreground text-xs">
											<span>{project.visibility}</span>
											<span>Created {formatDate(project.createdAt)}</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			) : (
				<div className="mt-6 space-y-2">
					{filteredProjects.map((project) => (
						<Link
							key={project.id}
							to="/projects/$projectId"
							params={{ projectId: project.id }}
						>
							<Card className="transition-colors hover:bg-muted/50">
								<CardContent className="flex items-center gap-4 p-4">
									<div
										className="size-3 shrink-0 rounded-full"
										style={{ backgroundColor: project.color || "#6b7280" }}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<h3 className="font-medium">{project.name}</h3>
											<Badge variant={statusBadgeVariants[project.status]}>
												{PROJECT_STATUS_CONFIG[project.status].label}
											</Badge>
										</div>
										<p className="mt-1 line-clamp-1 text-muted-foreground text-sm">
											{project.description || "No description"}
										</p>
									</div>
									<div className="hidden items-center gap-6 md:flex">
										<div className="text-muted-foreground text-sm">
											{project.visibility}
										</div>
										{project.endDate && (
											<div className="text-muted-foreground text-sm">
												{formatDate(project.endDate)}
											</div>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={(e) => e.preventDefault()}
									>
										<MoreHorizontal className="size-4" />
									</Button>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</ContentContainer>
	);
}
