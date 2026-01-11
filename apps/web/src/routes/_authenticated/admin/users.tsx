import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangleIcon,
	BanIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EyeIcon,
	Loader2Icon,
	MoreHorizontalIcon,
	PencilIcon,
	RefreshCwIcon,
	SearchIcon,
	ShieldCheckIcon,
	Trash2Icon,
	UserIcon,
	XCircleIcon,
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
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
	useBanUser,
	useDeleteUser,
	usePlatformUser,
	usePlatformUsers,
	useUnbanUser,
	useUpdateUser,
} from "@/features/admin/hooks/use-admin";
import type { PlatformUser } from "@/features/admin/types";
import { USER_ROLE_CONFIG, USER_STATUS_CONFIG } from "@/features/admin/types";
import { useDebounce } from "@/hooks/use-debounce";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/admin/users")({
	component: AdminUsers,
});

function AdminUsers() {
	// Filters state
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [page, setPage] = useState(1);
	const pageSize = 20;

	// Debounce search to avoid excessive API calls
	const debouncedSearch = useDebounce(searchQuery, 300);

	// Modal states
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// Edit form state
	const [editForm, setEditForm] = useState({ name: "", email: "" });

	// Ban form state
	const [banReason, setBanReason] = useState("");

	// Query for users list
	const {
		data: usersData,
		isLoading,
		isError,
		error,
		refetch,
	} = usePlatformUsers({
		search: debouncedSearch || undefined,
		status: statusFilter === "all" ? undefined : (statusFilter as PlatformUser["status"]),
		page,
		limit: pageSize,
	});

	// Query for selected user details
	const { data: selectedUser } = usePlatformUser(selectedUserId ?? "");

	// Mutations
	const updateUserMutation = useUpdateUser();
	const banUserMutation = useBanUser();
	const unbanUserMutation = useUnbanUser();
	const deleteUserMutation = useDeleteUser();

	const users = usersData?.items ?? [];
	const totalPages = usersData?.totalPages ?? 1;
	const total = usersData?.total ?? 0;

	// Helper functions
	function getInitials(name: string) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}

	function formatDate(date: Date | string | undefined | null) {
		if (!date) return "Never";
		const d = typeof date === "string" ? new Date(date) : date;
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	// Handler functions
	function handleViewUser(userId: string) {
		setSelectedUserId(userId);
		setIsViewDialogOpen(true);
	}

	function handleEditUser(userId: string) {
		const user = users.find((u) => u.id === userId);
		if (user) {
			setSelectedUserId(userId);
			setEditForm({ name: user.name, email: user.email });
			setIsEditDialogOpen(true);
		}
	}

	function handleOpenBanDialog(userId: string) {
		setSelectedUserId(userId);
		setBanReason("");
		setIsBanDialogOpen(true);
	}

	function handleOpenDeleteDialog(userId: string) {
		setSelectedUserId(userId);
		setIsDeleteDialogOpen(true);
	}

	async function handleSaveEdit() {
		if (!selectedUserId) return;

		try {
			await updateUserMutation.mutateAsync({
				userId: selectedUserId,
				data: editForm,
			});
			toast.success("User updated successfully");
			setIsEditDialogOpen(false);
			setSelectedUserId(null);
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleBanUser() {
		if (!selectedUserId || !banReason.trim()) return;

		try {
			await banUserMutation.mutateAsync({
				userId: selectedUserId,
				reason: banReason,
			});
			toast.success("User has been suspended");
			setIsBanDialogOpen(false);
			setSelectedUserId(null);
			setBanReason("");
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleUnbanUser(userId: string) {
		try {
			await unbanUserMutation.mutateAsync(userId);
			toast.success("User has been unsuspended");
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleDeleteUser() {
		if (!selectedUserId) return;

		try {
			await deleteUserMutation.mutateAsync(selectedUserId);
			toast.success("User has been deleted");
			setIsDeleteDialogOpen(false);
			setSelectedUserId(null);
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	// Reset page when filters change
	function handleSearchChange(value: string) {
		setSearchQuery(value);
		setPage(1);
	}

	function handleStatusFilterChange(value: string | null) {
		setStatusFilter(value || "all");
		setPage(1);
	}

	// Render loading skeleton
	function renderLoadingSkeleton() {
		return (
			<TableBody>
				{Array.from({ length: 5 }).map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<div className="flex items-center gap-3">
								<Skeleton className="size-8 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-40" />
								</div>
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-20" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-8" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-24" />
						</TableCell>
						<TableCell className="text-right">
							<Skeleton className="ml-auto size-8" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		);
	}

	// Render error state
	if (isError) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl">Users</h1>
					<p className="text-muted-foreground text-sm">
						Manage all users on the platform.
					</p>
				</div>

				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<XCircleIcon className="mb-4 size-12 text-destructive" />
						<h3 className="mb-2 font-medium text-lg">Failed to load users</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							{handleApiError(error)}
						</p>
						<Button onClick={() => refetch()}>
							<RefreshCwIcon className="mr-2 size-4" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Users</h1>
				<p className="text-muted-foreground text-sm">
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
					{/* Filters */}
					<div className="mb-4 flex flex-col gap-4 sm:flex-row">
						<div className="relative flex-1">
							<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search users by name or email..."
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select
							value={statusFilter}
							onValueChange={handleStatusFilterChange}
						>
							<SelectTrigger className="w-[150px]">
								<SelectValue>
									{statusFilter === "all" ? "All Status" : statusFilter}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
								<SelectItem value="deleted">Deleted</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="icon"
							onClick={() => refetch()}
							disabled={isLoading}
						>
							<RefreshCwIcon
								className={`size-4 ${isLoading ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>

					{/* Users Table */}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Organizations</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						{isLoading ? (
							renderLoadingSkeleton()
						) : users.length === 0 ? (
							<TableBody>
								<TableRow>
									<TableCell colSpan={6} className="py-12 text-center">
										<UserIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
										<p className="font-medium text-muted-foreground">
											No users found
										</p>
										<p className="mt-1 text-muted-foreground/70 text-sm">
											{searchQuery || statusFilter !== "all"
												? "Try adjusting your filters"
												: "Users will appear here once they sign up"}
										</p>
									</TableCell>
								</TableRow>
							</TableBody>
						) : (
							<TableBody>
								{users.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar size="sm">
													<AvatarImage
														src={user.image ?? undefined}
														alt={user.name}
													/>
													<AvatarFallback>
														{getInitials(user.name)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-medium text-sm">{user.name}</p>
													<p className="text-muted-foreground text-xs">
														{user.email}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={USER_ROLE_CONFIG[user.role].color}
											>
												{USER_ROLE_CONFIG[user.role].label}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={USER_STATUS_CONFIG[user.status].color}
											>
												{USER_STATUS_CONFIG[user.status].label}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{user.organizationCount}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{formatDate(user.createdAt)}
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
														onClick={() => handleViewUser(user.id)}
													>
														<EyeIcon className="mr-2 size-4" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleEditUser(user.id)}
													>
														<PencilIcon className="mr-2 size-4" />
														Edit User
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{user.status === "suspended" ? (
														<DropdownMenuItem
															onClick={() => handleUnbanUser(user.id)}
														>
															<ShieldCheckIcon className="mr-2 size-4" />
															Unsuspend User
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => handleOpenBanDialog(user.id)}
															disabled={user.status === "deleted"}
														>
															<BanIcon className="mr-2 size-4" />
															Suspend User
														</DropdownMenuItem>
													)}
													<DropdownMenuItem
														className="text-destructive"
														onClick={() => handleOpenDeleteDialog(user.id)}
														disabled={user.status === "deleted"}
													>
														<Trash2Icon className="mr-2 size-4" />
														Delete User
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						)}
					</Table>

					{/* Pagination */}
					<div className="mt-4 flex items-center justify-between">
						<p className="text-muted-foreground text-sm">
							{isLoading ? (
								<Skeleton className="inline-block h-4 w-40" />
							) : (
								<>
									Showing {(page - 1) * pageSize + 1}-
									{Math.min(page * pageSize, total)} of {total} users
								</>
							)}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1 || isLoading}
								onClick={() => setPage((p) => p - 1)}
							>
								<ChevronLeftIcon className="size-4" />
								Previous
							</Button>
							<span className="text-muted-foreground text-sm">
								Page {page} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages || isLoading}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
								<ChevronRightIcon className="size-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* View User Dialog */}
			<Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>User Details</DialogTitle>
						<DialogDescription>
							Detailed information about this user.
						</DialogDescription>
					</DialogHeader>
					{selectedUser ? (
						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<Avatar size="lg">
									<AvatarImage
										src={selectedUser.image ?? undefined}
										alt={selectedUser.name}
									/>
									<AvatarFallback>
										{getInitials(selectedUser.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-medium">{selectedUser.name}</h3>
									<p className="text-muted-foreground text-sm">
										{selectedUser.email}
									</p>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-muted-foreground text-xs">Role</p>
									<Badge
										variant="outline"
										className={USER_ROLE_CONFIG[selectedUser.role].color}
									>
										{USER_ROLE_CONFIG[selectedUser.role].label}
									</Badge>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Status</p>
									<Badge
										variant="outline"
										className={USER_STATUS_CONFIG[selectedUser.status].color}
									>
										{USER_STATUS_CONFIG[selectedUser.status].label}
									</Badge>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Organizations</p>
									<p className="font-medium text-sm">
										{selectedUser.organizationCount}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Email Verified</p>
									<p className="font-medium text-sm">
										{selectedUser.emailVerified ? "Yes" : "No"}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Created</p>
									<p className="font-medium text-sm">
										{formatDate(selectedUser.createdAt)}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Last Login</p>
									<p className="font-medium text-sm">
										{formatDate(selectedUser.lastLoginAt)}
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center py-8">
							<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
						</div>
					)}
					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit User</DialogTitle>
						<DialogDescription>
							Update the user's profile information.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								value={editForm.name}
								onChange={(e) =>
									setEditForm((f) => ({ ...f, name: e.target.value }))
								}
								placeholder="Enter user name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-email">Email</Label>
							<Input
								id="edit-email"
								type="email"
								value={editForm.email}
								onChange={(e) =>
									setEditForm((f) => ({ ...f, email: e.target.value }))
								}
								placeholder="Enter email address"
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button
							onClick={handleSaveEdit}
							disabled={updateUserMutation.isPending}
						>
							{updateUserMutation.isPending && (
								<Loader2Icon className="mr-2 size-4 animate-spin" />
							)}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Ban User Dialog */}
			<Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertTriangleIcon className="size-5 text-amber-500" />
							Suspend User
						</DialogTitle>
						<DialogDescription>
							This will prevent the user from accessing the platform. They will
							be logged out of all sessions.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="ban-reason">Reason for suspension</Label>
							<Textarea
								id="ban-reason"
								value={banReason}
								onChange={(e) => setBanReason(e.target.value)}
								placeholder="Enter the reason for suspending this user..."
								className="min-h-[100px]"
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleBanUser}
							disabled={!banReason.trim() || banUserMutation.isPending}
						>
							{banUserMutation.isPending && (
								<Loader2Icon className="mr-2 size-4 animate-spin" />
							)}
							Suspend User
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete User Confirmation Dialog */}
			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this user? This action cannot be
							undone. All of the user's data will be permanently removed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteUser}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteUserMutation.isPending ? (
								<Loader2Icon className="mr-2 size-4 animate-spin" />
							) : (
								<Trash2Icon className="mr-2 size-4" />
							)}
							Delete User
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
