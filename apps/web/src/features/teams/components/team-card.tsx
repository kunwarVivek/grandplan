import { MoreHorizontal, Settings, Trash2, Users2, UserPlus } from "lucide-react";
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
import { Avatar } from "@/components/ui/avatar";
import type { Team, TeamMember } from "../types";

type TeamCardProps = {
	team: Team;
	members?: TeamMember[];
	memberCount?: number;
	onSelect?: (team: Team) => void;
	onEdit?: (team: Team) => void;
	onDelete?: (team: Team) => void;
	onAddMember?: (team: Team) => void;
	canEdit?: boolean;
	canDelete?: boolean;
};

export function TeamCard({
	team,
	members = [],
	memberCount,
	onSelect,
	onEdit,
	onDelete,
	onAddMember,
	canEdit = true,
	canDelete = true,
}: TeamCardProps) {
	const displayMemberCount = memberCount ?? members.length;
	const displayMembers = members.slice(0, 5);
	const remainingCount = displayMemberCount - displayMembers.length;

	const handleClick = () => {
		onSelect?.(team);
	};

	const handleDelete = () => {
		if (
			confirm(
				`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`,
			)
		) {
			onDelete?.(team);
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
							backgroundColor: team.color
								? `${team.color}20`
								: undefined,
							color: team.color ?? undefined,
						}}
					>
						{team.icon ? (
							<span className="text-lg">{team.icon}</span>
						) : (
							<Users2 className="size-5" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate">{team.name}</CardTitle>
						{team.description && (
							<CardDescription className="line-clamp-1">
								{team.description}
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
											onSelect={() => onEdit?.(team)}
										>
											<Settings className="size-4" />
											Settings
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => onAddMember?.(team)}
										>
											<UserPlus className="size-4" />
											Add member
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
										Delete team
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</CardAction>
			</CardHeader>

			<CardContent>
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						{displayMembers.length > 0 ? (
							<div className="flex -space-x-2">
								{displayMembers.map((member) => (
									<Avatar
										key={member.id}
										className="size-7 ring-2 ring-background"
									>
										{member.user.image ? (
											<img
												src={member.user.image}
												alt={member.user.name}
											/>
										) : (
											<div className="flex size-full items-center justify-center bg-muted text-xs font-medium uppercase">
												{member.user.name.charAt(0)}
											</div>
										)}
									</Avatar>
								))}
								{remainingCount > 0 && (
									<div className="flex size-7 items-center justify-center bg-muted text-xs font-medium ring-2 ring-background">
										+{remainingCount}
									</div>
								)}
							</div>
						) : (
							<span className="text-xs text-muted-foreground">
								No members
							</span>
						)}
					</div>

					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Users2 className="size-3.5" />
						<span>
							{displayMemberCount}{" "}
							{displayMemberCount === 1 ? "member" : "members"}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
