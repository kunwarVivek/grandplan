import { Calendar, FolderKanban, MoreHorizontal, Settings, Trash2, Copy, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardAction,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project, ProjectStats } from "../types";
import { PROJECT_STATUS_CONFIG } from "../types";

type ProjectCardProps = {
	project: Project;
	stats?: ProjectStats;
	onSelect?: (project: Project) => void;
	onEdit?: (project: Project) => void;
	onDelete?: (project: Project) => void;
	onDuplicate?: (project: Project) => void;
	onArchive?: (project: Project) => void;
	canEdit?: boolean;
	canDelete?: boolean;
};

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function ProjectCard({
	project,
	stats,
	onSelect,
	onEdit,
	onDelete,
	onDuplicate,
	onArchive,
	canEdit = true,
	canDelete = true,
}: ProjectCardProps) {
	const statusConfig = PROJECT_STATUS_CONFIG[project.status];

	const handleClick = () => {
		onSelect?.(project);
	};

	const handleDelete = () => {
		if (
			confirm(
				`Are you sure you want to delete "${project.name}"? This will also delete all associated tasks.`,
			)
		) {
			onDelete?.(project);
		}
	};

	return (
		<Card
			className="cursor-pointer transition-shadow hover:shadow-md"
			onClick={handleClick}
		>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div
						className="flex size-10 items-center justify-center shrink-0"
						style={{
							backgroundColor: project.color
								? `${project.color}20`
								: undefined,
							color: project.color ?? undefined,
						}}
					>
						{project.icon ? (
							<span className="text-lg">{project.icon}</span>
						) : (
							<FolderKanban className="size-5" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate">{project.name}</CardTitle>
						{project.description && (
							<CardDescription className="line-clamp-1">
								{project.description}
							</CardDescription>
						)}
					</div>
				</div>

				<CardAction>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className={statusConfig.color}>
							{statusConfig.label}
						</Badge>
						{(canEdit || canDelete) && (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={(e) => e.stopPropagation()}
										/>
									}
								>
									<MoreHorizontal className="size-4" />
									<span className="sr-only">Actions</span>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end">
									{canEdit && (
										<>
											<DropdownMenuItem
												onSelect={() => onEdit?.(project)}
											>
												<Settings className="size-4" />
												Settings
											</DropdownMenuItem>
											<DropdownMenuItem
												onSelect={() => onDuplicate?.(project)}
											>
												<Copy className="size-4" />
												Duplicate
											</DropdownMenuItem>
											<DropdownMenuItem
												onSelect={() => onArchive?.(project)}
											>
												<Archive className="size-4" />
												Archive
											</DropdownMenuItem>
										</>
									)}
									{canEdit && canDelete && <DropdownMenuSeparator />}
									{canDelete && (
										<DropdownMenuItem
											variant="destructive"
											onSelect={handleDelete}
										>
											<Trash2 className="size-4" />
											Delete project
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</CardAction>
			</CardHeader>

			<CardContent>
				<div className="space-y-3">
					{stats && (
						<div className="space-y-1">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Progress</span>
								<span className="font-medium">
									{stats.completedTasks}/{stats.totalTasks} tasks
								</span>
							</div>
							<Progress
								value={stats.completionPercentage}
								className="h-1.5"
							/>
						</div>
					)}

					<div className="flex items-center justify-between text-xs text-muted-foreground">
						{(project.startDate || project.endDate) && (
							<div className="flex items-center gap-1">
								<Calendar className="size-3.5" />
								<span>
									{formatDate(project.startDate)}
									{project.startDate && project.endDate && " - "}
									{formatDate(project.endDate)}
								</span>
							</div>
						)}
						{stats && stats.overdueTasks > 0 && (
							<Badge variant="destructive" className="text-xs">
								{stats.overdueTasks} overdue
							</Badge>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
