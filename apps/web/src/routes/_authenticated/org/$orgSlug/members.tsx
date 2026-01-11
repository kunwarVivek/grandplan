import { createFileRoute } from "@tanstack/react-router";
import {
	LoaderIcon,
	MailPlusIcon,
	MoreHorizontalIcon,
	PlusIcon,
	SearchIcon,
	ShieldIcon,
	ShieldCheckIcon,
	UsersIcon,
	UserMinusIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useInviteMember,
	useOrganizationMembers,
	useRemoveMember,
	useUpdateMemberRole,
} from "@/features/organizations/hooks/use-organizations";
import type {
	OrganizationMember,
	OrganizationRole,
} from "@/features/organizations/types";
import { ORGANIZATION_ROLE_CONFIG } from "@/features/organizations/types";
import { handleApiError } from "@/lib/api-client";
import { useOrganizationStore } from "@/stores/organization-store";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/members")({
	component: OrgMembers,
});

// Loading skeleton for member list
function MemberTableSkeleton() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Member</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Joined</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[1, 2, 3, 4].map((i) => (
					<TableRow key={i}>
						<TableCell>
							<div className="flex items-center gap-3">
								<Skeleton className="size-8 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</div>
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-20" />
						</TableCell>
						<TableCell className="text-right">
							<Skeleton className="ml-auto h-7 w-7" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function OrgMembers() {
	const activeOrganization = useOrganizationStore(
		(state) => state.activeOrganization,
	);
	const organizationId = activeOrganization?.id ?? "";

	const [searchQuery, setSearchQuery] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<OrganizationRole>("member");
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

	// State for confirmation dialogs
	const [memberToRemove, setMemberToRemove] =
		useState<OrganizationMember | null>(null);
	const [roleChangeData, setRoleChangeData] = useState<{
		member: OrganizationMember;
		newRole: "admin" | "member";
	} | null>(null);

	// React Query hooks
	const { data: membersData, isLoading: isLoadingMembers } =
		useOrganizationMembers(organizationId);
	const inviteMutation = useInviteMember();
	const removeMemberMutation = useRemoveMember();
	const updateRoleMutation = useUpdateMemberRole();

	const members = membersData?.members ?? [];

	const filteredMembers = members.filter(
		(member) =>
			member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			member.user.email.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();

		if (!organizationId) {
			toast.error("Organization not found");
			return;
		}

		inviteMutation.mutate(
			{
				organizationId,
				email: inviteEmail,
				role: inviteRole,
			},
			{
				onSuccess: () => {
					toast.success(`Invitation sent to ${inviteEmail}`);
					setInviteEmail("");
					setInviteRole("member");
					setIsInviteDialogOpen(false);
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	function handleChangeRole(member: OrganizationMember, newRole: "admin" | "member") {
		// Show confirmation dialog
		setRoleChangeData({ member, newRole });
	}

	function confirmRoleChange() {
		if (!roleChangeData || !organizationId) return;

		const { member, newRole } = roleChangeData;

		updateRoleMutation.mutate(
			{
				organizationId,
				memberId: member.id,
				role: newRole,
			},
			{
				onSuccess: () => {
					toast.success(
						`${member.user.name} is now ${newRole === "admin" ? "an admin" : "a member"}`,
					);
					setRoleChangeData(null);
				},
				onError: (error) => {
					toast.error(handleApiError(error));
					setRoleChangeData(null);
				},
			},
		);
	}

	function handleRemoveMember(member: OrganizationMember) {
		// Show confirmation dialog
		setMemberToRemove(member);
	}

	function confirmRemoveMember() {
		if (!memberToRemove || !organizationId) return;

		removeMemberMutation.mutate(
			{
				organizationId,
				memberId: memberToRemove.id,
			},
			{
				onSuccess: () => {
					toast.success(`${memberToRemove.user.name} has been removed`);
					setMemberToRemove(null);
				},
				onError: (error) => {
					toast.error(handleApiError(error));
					setMemberToRemove(null);
				},
			},
		);
	}

	function getInitials(name: string) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
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
				return ShieldCheckIcon;
			case "admin":
				return ShieldIcon;
			default:
				return UsersIcon;
		}
	}

	function formatJoinedDate(date: Date) {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(new Date(date));
	}

	const isInviting = inviteMutation.isPending;
	const isRemovingMember = removeMemberMutation.isPending;
	const isUpdatingRole = updateRoleMutation.isPending;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Members</CardTitle>
							<CardDescription>
								Manage your organization's team members and their roles.
							</CardDescription>
						</div>
						<Dialog
							open={isInviteDialogOpen}
							onOpenChange={setIsInviteDialogOpen}
						>
							<DialogTrigger render={<Button />}>
								<PlusIcon className="size-4" />
								Invite Member
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Invite Member</DialogTitle>
									<DialogDescription>
										Send an invitation to a new team member. They will receive
										an email with instructions to join.
									</DialogDescription>
								</DialogHeader>
								<form onSubmit={handleInvite} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="invite-email">Email Address</Label>
										<Input
											id="invite-email"
											type="email"
											value={inviteEmail}
											onChange={(e) => setInviteEmail(e.target.value)}
											placeholder="team@example.com"
											required
											disabled={isInviting}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="invite-role">Role</Label>
										<Select
											value={inviteRole}
											onValueChange={(val) =>
												setInviteRole((val as OrganizationRole) ?? "member")
											}
											disabled={isInviting}
										>
											<SelectTrigger className="w-full">
												<SelectValue>
													{ORGANIZATION_ROLE_CONFIG[inviteRole]?.label ||
														"Select a role"}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="admin">
													<div className="flex flex-col">
														<span>Admin</span>
														<span className="text-muted-foreground text-xs">
															{ORGANIZATION_ROLE_CONFIG.admin.description}
														</span>
													</div>
												</SelectItem>
												<SelectItem value="member">
													<div className="flex flex-col">
														<span>Member</span>
														<span className="text-muted-foreground text-xs">
															{ORGANIZATION_ROLE_CONFIG.member.description}
														</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<DialogFooter>
										<Button type="submit" disabled={isInviting}>
											{isInviting ? (
												<>
													<LoaderIcon className="size-4 animate-spin" />
													Sending...
												</>
											) : (
												<>
													<MailPlusIcon className="size-4" />
													Send Invitation
												</>
											)}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-4">
						<div className="relative">
							<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search members by name or email..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>
					</div>

					{isLoadingMembers ? (
						<MemberTableSkeleton />
					) : filteredMembers.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
							<UsersIcon className="size-8 text-muted-foreground" />
							<p className="text-muted-foreground text-sm">
								{searchQuery
									? "No members match your search"
									: "No members in this organization"}
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Member</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredMembers.map((member) => {
									const RoleIcon = getRoleIcon(member.role);
									const isOwner = member.role === "owner";

									return (
										<TableRow key={member.id}>
											<TableCell>
												<div className="flex items-center gap-3">
													<Avatar size="sm">
														<AvatarImage
															src={member.user.image ?? undefined}
															alt={member.user.name}
														/>
														<AvatarFallback>
															{getInitials(member.user.name)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-medium text-sm">
															{member.user.name}
														</p>
														<p className="text-muted-foreground text-xs">
															{member.user.email}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={getRoleBadgeVariant(member.role)}
													className="gap-1"
												>
													<RoleIcon className="size-3" />
													{ORGANIZATION_ROLE_CONFIG[member.role].label}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{formatJoinedDate(member.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												{!isOwner && (
													<DropdownMenu>
														<DropdownMenuTrigger
															render={<Button variant="ghost" size="icon-sm" />}
														>
															<MoreHorizontalIcon className="size-4" />
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{member.role === "member" && (
																<DropdownMenuItem
																	onSelect={() =>
																		handleChangeRole(member, "admin")
																	}
																	disabled={isUpdatingRole}
																>
																	<ShieldIcon className="size-4" />
																	Make Admin
																</DropdownMenuItem>
															)}
															{member.role === "admin" && (
																<DropdownMenuItem
																	onSelect={() =>
																		handleChangeRole(member, "member")
																	}
																	disabled={isUpdatingRole}
																>
																	<UsersIcon className="size-4" />
																	Remove Admin Role
																</DropdownMenuItem>
															)}
															<DropdownMenuSeparator />
															<DropdownMenuItem
																variant="destructive"
																onSelect={() => handleRemoveMember(member)}
																disabled={isRemovingMember}
															>
																<UserMinusIcon className="size-4" />
																Remove Member
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Role Change Confirmation Dialog */}
			<AlertDialog
				open={!!roleChangeData}
				onOpenChange={(open) => !open && setRoleChangeData(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Change Member Role</AlertDialogTitle>
						<AlertDialogDescription>
							{roleChangeData && (
								<>
									Are you sure you want to{" "}
									{roleChangeData.newRole === "admin"
										? "promote"
										: "demote"}{" "}
									<span className="font-medium text-foreground">
										{roleChangeData.member.user.name}
									</span>{" "}
									to{" "}
									{roleChangeData.newRole === "admin" ? "Admin" : "Member"}?
									{roleChangeData.newRole === "admin" && (
										<>
											{" "}
											Admins can manage members and organization settings.
										</>
									)}
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isUpdatingRole}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmRoleChange}
							disabled={isUpdatingRole}
						>
							{isUpdatingRole ? (
								<>
									<LoaderIcon className="size-4 animate-spin" />
									Updating...
								</>
							) : (
								"Confirm"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remove Member Confirmation Dialog */}
			<AlertDialog
				open={!!memberToRemove}
				onOpenChange={(open) => !open && setMemberToRemove(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Member</AlertDialogTitle>
						<AlertDialogDescription>
							{memberToRemove && (
								<>
									Are you sure you want to remove{" "}
									<span className="font-medium text-foreground">
										{memberToRemove.user.name}
									</span>{" "}
									from this organization? They will lose access to all
									organization resources.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isRemovingMember}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmRemoveMember}
							disabled={isRemovingMember}
						>
							{isRemovingMember ? (
								<>
									<LoaderIcon className="size-4 animate-spin" />
									Removing...
								</>
							) : (
								"Remove Member"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
