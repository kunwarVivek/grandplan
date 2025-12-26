import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/members")({
	component: OrgMembers,
});

interface Member {
	id: string;
	name: string;
	email: string;
	role: "owner" | "admin" | "member";
	avatar?: string;
	joinedAt: string;
}

function OrgMembers() {
	const [searchQuery, setSearchQuery] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<string>("member");
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

	const members: Member[] = [
		{
			id: "1",
			name: "John Doe",
			email: "john@example.com",
			role: "owner",
			joinedAt: "Jan 1, 2024",
		},
		{
			id: "2",
			name: "Jane Smith",
			email: "jane@example.com",
			role: "admin",
			joinedAt: "Feb 15, 2024",
		},
		{
			id: "3",
			name: "Bob Johnson",
			email: "bob@example.com",
			role: "member",
			joinedAt: "Mar 20, 2024",
		},
		{
			id: "4",
			name: "Alice Williams",
			email: "alice@example.com",
			role: "member",
			joinedAt: "Apr 5, 2024",
		},
	];

	const filteredMembers = members.filter(
		(member) =>
			member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			member.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		// TODO: Implement member invitation
		console.log("Invite member:", { email: inviteEmail, role: inviteRole });
		setInviteEmail("");
		setInviteRole("member");
		setIsInviteDialogOpen(false);
	}

	function handleChangeRole(memberId: string, newRole: string) {
		// TODO: Implement role change
		console.log("Change role:", { memberId, newRole });
	}

	function handleRemoveMember(memberId: string) {
		// TODO: Implement member removal
		console.log("Remove member:", memberId);
	}

	function getInitials(name: string) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase();
	}

	function getRoleBadgeVariant(role: string) {
		switch (role) {
			case "owner":
				return "default";
			case "admin":
				return "secondary";
			default:
				return "outline";
		}
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Members</CardTitle>
							<CardDescription>
								Manage your organization's team members.
							</CardDescription>
						</div>
						<Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
							<DialogTrigger render={<Button />}>
								<PlusIcon className="size-4" />
								Invite Member
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Invite Member</DialogTitle>
									<DialogDescription>
										Send an invitation to a new team member.
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
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="invite-role">Role</Label>
										<Select value={inviteRole} onValueChange={(val) => setInviteRole(val ?? "member")}>
											<SelectTrigger className="w-full">
												<SelectValue>{inviteRole || "Select a role"}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="admin">Admin</SelectItem>
												<SelectItem value="member">Member</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<DialogFooter>
										<Button type="submit">Send Invitation</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-4">
						<div className="relative">
							<SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search members..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>
					</div>

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
							{filteredMembers.map((member) => (
								<TableRow key={member.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar size="sm">
												<AvatarImage src={member.avatar} alt={member.name} />
												<AvatarFallback>{getInitials(member.name)}</AvatarFallback>
											</Avatar>
											<div>
												<p className="text-sm font-medium">{member.name}</p>
												<p className="text-xs text-muted-foreground">
													{member.email}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={getRoleBadgeVariant(member.role)}>
											{member.role}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{member.joinedAt}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
										<DropdownMenuTrigger
											render={<Button variant="ghost" size="icon-sm" />}
										>
											<MoreHorizontalIcon className="size-4" />
										</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => handleChangeRole(member.id, "admin")}
													disabled={member.role === "owner"}
												>
													Make Admin
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleChangeRole(member.id, "member")}
													disabled={member.role === "owner"}
												>
													Make Member
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleRemoveMember(member.id)}
													disabled={member.role === "owner"}
												>
													Remove Member
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
