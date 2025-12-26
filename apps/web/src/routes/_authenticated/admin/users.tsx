import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
	SearchIcon,
} from "lucide-react";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/admin/users")({
	component: AdminUsers,
});

interface User {
	id: string;
	name: string;
	email: string;
	role: "admin" | "user";
	status: "active" | "inactive" | "suspended";
	plan: "free" | "pro" | "enterprise";
	createdAt: string;
	avatar?: string;
}

function AdminUsers() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [roleFilter, setRoleFilter] = useState<string>("all");

	const users: User[] = [
		{
			id: "1",
			name: "John Doe",
			email: "john@example.com",
			role: "admin",
			status: "active",
			plan: "enterprise",
			createdAt: "Jan 15, 2024",
		},
		{
			id: "2",
			name: "Jane Smith",
			email: "jane@example.com",
			role: "user",
			status: "active",
			plan: "pro",
			createdAt: "Feb 20, 2024",
		},
		{
			id: "3",
			name: "Bob Johnson",
			email: "bob@example.com",
			role: "user",
			status: "inactive",
			plan: "free",
			createdAt: "Mar 10, 2024",
		},
		{
			id: "4",
			name: "Alice Williams",
			email: "alice@example.com",
			role: "user",
			status: "suspended",
			plan: "pro",
			createdAt: "Apr 5, 2024",
		},
		{
			id: "5",
			name: "Charlie Brown",
			email: "charlie@example.com",
			role: "user",
			status: "active",
			plan: "free",
			createdAt: "May 1, 2024",
		},
	];

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === "all" || user.status === statusFilter;
		const matchesRole = roleFilter === "all" || user.role === roleFilter;
		return matchesSearch && matchesStatus && matchesRole;
	});

	function getInitials(name: string) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase();
	}

	function getStatusBadgeVariant(status: string) {
		switch (status) {
			case "active":
				return "default";
			case "inactive":
				return "secondary";
			case "suspended":
				return "destructive";
			default:
				return "outline";
		}
	}

	function handleViewUser(userId: string) {
		console.log("View user:", userId);
	}

	function handleEditUser(userId: string) {
		console.log("Edit user:", userId);
	}

	function handleSuspendUser(userId: string) {
		console.log("Suspend user:", userId);
	}

	function handleDeleteUser(userId: string) {
		console.log("Delete user:", userId);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Users</h1>
				<p className="text-sm text-muted-foreground">
					Manage all users on the platform.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Users</CardTitle>
					<CardDescription>
						A list of all registered users on the platform.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mb-4 flex flex-col gap-4 sm:flex-row">
						<div className="relative flex-1">
							<SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search users..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
							<SelectTrigger className="w-[150px]">
								<SelectValue>{statusFilter === "all" ? "Status" : statusFilter}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
							</SelectContent>
						</Select>
						<Select value={roleFilter} onValueChange={(val) => setRoleFilter(val ?? "all")}>
							<SelectTrigger className="w-[150px]">
								<SelectValue>{roleFilter === "all" ? "Role" : roleFilter}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="user">User</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredUsers.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar size="sm">
												<AvatarImage src={user.avatar} alt={user.name} />
												<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
											</Avatar>
											<div>
												<p className="text-sm font-medium">{user.name}</p>
												<p className="text-xs text-muted-foreground">
													{user.email}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={user.role === "admin" ? "default" : "outline"}>
											{user.role}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={getStatusBadgeVariant(user.status)}>
											{user.status}
										</Badge>
									</TableCell>
									<TableCell className="capitalize">{user.plan}</TableCell>
									<TableCell className="text-muted-foreground">
										{user.createdAt}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger
												render={<Button variant="ghost" size="icon-sm" />}
											>
												<MoreHorizontalIcon className="size-4" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleViewUser(user.id)}>
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleEditUser(user.id)}>
													Edit User
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleSuspendUser(user.id)}
													disabled={user.status === "suspended"}
												>
													Suspend User
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDeleteUser(user.id)}
												>
													Delete User
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					<div className="mt-4 flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							Showing {filteredUsers.length} of {users.length} users
						</p>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" disabled>
								<ChevronLeftIcon className="size-4" />
								Previous
							</Button>
							<Button variant="outline" size="sm" disabled>
								Next
								<ChevronRightIcon className="size-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
