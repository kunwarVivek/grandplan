import { MoreHorizontal, Shield, ShieldCheck, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useOrganizationMembers,
	useRemoveMember,
	useUpdateMemberRole,
} from "../hooks/use-organizations";
import type { OrganizationMember, OrganizationRole } from "../types";
import { ORGANIZATION_ROLE_CONFIG } from "../types";

type MemberListProps = {
	organizationId: string;
	currentUserId?: string;
	currentUserRole?: OrganizationRole;
};

function MemberListSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex items-center gap-3 p-3">
					<Skeleton className="size-10 rounded-full" />
					<div className="flex-1 space-y-1">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-48" />
					</div>
					<Skeleton className="h-5 w-16" />
				</div>
			))}
		</div>
	);
}

function getRoleBadgeVariant(role: OrganizationRole) {
	switch (role) {
		case "owner":
			return "default";
		case "admin":
			return "secondary";
		default:
			return "outline";
	}
}

function getRoleIcon(role: OrganizationRole) {
	switch (role) {
		case "owner":
			return ShieldCheck;
		case "admin":
			return Shield;
		default:
			return Users;
	}
}

export function MemberList({
	organizationId,
	currentUserId,
	currentUserRole,
}: MemberListProps) {
	const { data, isLoading } = useOrganizationMembers(organizationId);
	const removeMember = useRemoveMember();
	const updateRole = useUpdateMemberRole();

	const members = data?.members ?? [];
	const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

	if (isLoading) {
		return <MemberListSkeleton />;
	}

	if (members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
				<Users className="size-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">No members found</p>
			</div>
		);
	}

	const handleRemoveMember = (member: OrganizationMember) => {
		if (
			confirm(
				`Are you sure you want to remove ${member.user.name} from this organization?`,
			)
		) {
			removeMember.mutate({
				organizationId,
				memberId: member.id,
			});
		}
	};

	const handleUpdateRole = (
		member: OrganizationMember,
		newRole: "admin" | "member",
	) => {
		updateRole.mutate({
			organizationId,
			memberId: member.id,
			role: newRole,
		});
	};

	return (
		<div className="divide-y divide-border">
			{members.map((member) => {
				const RoleIcon = getRoleIcon(member.role);
				const isCurrentUser = member.userId === currentUserId;
				const canModify =
					canManageMembers &&
					!isCurrentUser &&
					member.role !== "owner" &&
					(currentUserRole === "owner" || member.role !== "admin");

				return (
					<div
						key={member.id}
						className="flex items-center gap-3 p-3 hover:bg-muted/50"
					>
						<Avatar className="size-10">
							{member.user.image ? (
								<img src={member.user.image} alt={member.user.name} />
							) : (
								<div className="flex size-full items-center justify-center bg-muted text-sm font-medium uppercase">
									{member.user.name.charAt(0)}
								</div>
							)}
						</Avatar>

						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">
								{member.user.name}
								{isCurrentUser && (
									<span className="ml-1 text-muted-foreground">(you)</span>
								)}
							</p>
							<p className="text-xs text-muted-foreground truncate">
								{member.user.email}
							</p>
						</div>

						<Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
							<RoleIcon className="size-3" />
							{ORGANIZATION_ROLE_CONFIG[member.role].label}
						</Badge>

						{canModify && (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button variant="ghost" size="icon-sm" />
									}
								>
									<MoreHorizontal className="size-4" />
									<span className="sr-only">Actions</span>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuSeparator />

									{currentUserRole === "owner" && (
										<>
											{member.role === "member" && (
												<DropdownMenuItem
													onSelect={() => handleUpdateRole(member, "admin")}
												>
													<Shield className="size-4" />
													Make admin
												</DropdownMenuItem>
											)}
											{member.role === "admin" && (
												<DropdownMenuItem
													onSelect={() => handleUpdateRole(member, "member")}
												>
													<Users className="size-4" />
													Remove admin role
												</DropdownMenuItem>
											)}
											<DropdownMenuSeparator />
										</>
									)}

									<DropdownMenuItem
										variant="destructive"
										onSelect={() => handleRemoveMember(member)}
									>
										<UserMinus className="size-4" />
										Remove from organization
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				);
			})}
		</div>
	);
}
