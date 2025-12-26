import { FolderKanban, MoreHorizontal, Settings, Trash2, Users } from "lucide-react";
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
import type { Workspace } from "../types";

type WorkspaceCardProps = {
	workspace: Workspace;
	projectCount?: number;
	memberCount?: number;
	onSelect?: (workspace: Workspace) => void;
	onEdit?: (workspace: Workspace) => void;
	onDelete?: (workspace: Workspace) => void;
	onManageMembers?: (workspace: Workspace) => void;
	canEdit?: boolean;
	canDelete?: boolean;
};

export function WorkspaceCard({
	workspace,
	projectCount = 0,
	memberCount = 0,
	onSelect,
	onEdit,
	onDelete,
	onManageMembers,
	canEdit = true,
	canDelete = true,
}: WorkspaceCardProps) {
	const handleClick = () => {
		onSelect?.(workspace);
	};

	const handleDelete = () => {
		if (
			confirm(
				`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`,
			)
		) {
			onDelete?.(workspace);
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
							backgroundColor: workspace.color
								? `${workspace.color}20`
								: undefined,
							color: workspace.color ?? undefined,
						}}
					>
						{workspace.icon ? (
							<span className="text-lg">{workspace.icon}</span>
						) : (
							<FolderKanban className="size-5" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate">{workspace.name}</CardTitle>
						{workspace.description && (
							<CardDescription className="line-clamp-1">
								{workspace.description}
							</CardDescription>
						)}
					</div>
				</div>

				<CardAction>
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
											onSelect={() => onEdit?.(workspace)}
										>
											<Settings className="size-4" />
											Settings
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => onManageMembers?.(workspace)}
										>
											<Users className="size-4" />
											Manage members
										</DropdownMenuItem>
									</>
								)}
								{canEdit && canDelete && <DropdownMenuSeparator />}
								{canDelete && !workspace.isDefault && (
									<DropdownMenuItem
										variant="destructive"
										onSelect={handleDelete}
									>
										<Trash2 className="size-4" />
										Delete workspace
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</CardAction>
			</CardHeader>

			<CardContent>
				<div className="flex items-center gap-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<FolderKanban className="size-3.5" />
						<span>
							{projectCount} {projectCount === 1 ? "project" : "projects"}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<Users className="size-3.5" />
						<span>
							{memberCount} {memberCount === 1 ? "member" : "members"}
						</span>
					</div>
					{workspace.isDefault && (
						<Badge variant="secondary" className="ml-auto">
							Default
						</Badge>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
