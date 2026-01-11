import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangleIcon,
	BuildingIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EyeIcon,
	LoaderIcon,
	MoreHorizontalIcon,
	PauseIcon,
	PencilIcon,
	PlayIcon,
	SearchIcon,
	TrashIcon,
	UsersIcon,
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
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	useDeleteOrganization,
	usePlatformOrganization,
	usePlatformOrganizations,
	useSuspendOrganization,
	useUnsuspendOrganization,
	useUpdateOrganization,
} from "@/features/admin/hooks/use-admin";
import { ORG_STATUS_CONFIG, type PlatformOrganization } from "@/features/admin/types";
import { useDebounce } from "@/hooks/use-debounce";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/admin/organizations")({
	component: AdminOrganizations,
});

const PAGE_SIZE = 10;

function AdminOrganizations() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [planFilter, setPlanFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);

	// Dialogs state
	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

	// Edit form state
	const [editName, setEditName] = useState("");
	const [editSlug, setEditSlug] = useState("");

	// Suspend form state
	const [suspendReason, setSuspendReason] = useState("");

	// Debounce search query for API calls
	const debouncedSearch = useDebounce(searchQuery, 300);

	// Fetch organizations with filters
	const { data, isLoading, isError, error, refetch } = usePlatformOrganizations({
		search: debouncedSearch || undefined,
		status: statusFilter === "all" ? undefined : (statusFilter as PlatformOrganization["status"]),
		plan: planFilter === "all" ? undefined : planFilter,
		page: currentPage,
		limit: PAGE_SIZE,
	});

	// Fetch selected organization details
	const { data: selectedOrg } = usePlatformOrganization(selectedOrgId ?? "");

	// Mutations
	const updateOrgMutation = useUpdateOrganization();
	const suspendOrgMutation = useSuspendOrganization();
	const unsuspendOrgMutation = useUnsuspendOrganization();
	const deleteOrgMutation = useDeleteOrganization();

	const organizations = data?.data ?? [];
	const totalItems = data?.meta?.total ?? 0;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);

	function getPlanBadgeVariant(plan: string) {
		switch (plan.toLowerCase()) {
			case "enterprise":
				return "default";
			case "pro":
				return "secondary";
			default:
				return "outline";
		}
	}

	function getStatusConfig(status: PlatformOrganization["status"]) {
		return ORG_STATUS_CONFIG[status] ?? ORG_STATUS_CONFIG.active;
	}

	function formatDate(date: Date | string) {
		const d = typeof date === "string" ? new Date(date) : date;
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	function handleViewOrg(orgId: string) {
		setSelectedOrgId(orgId);
		setViewDialogOpen(true);
	}

	function handleEditOrg(org: PlatformOrganization) {
		setSelectedOrgId(org.id);
		setEditName(org.name);
		setEditSlug(org.slug);
		setEditDialogOpen(true);
	}

	function handleSuspendOrg(orgId: string) {
		setSelectedOrgId(orgId);
		setSuspendReason("");
		setSuspendDialogOpen(true);
	}

	function handleUnsuspendOrg(orgId: string) {
		unsuspendOrgMutation.mutate(orgId, {
			onSuccess: () => {
				toast.success("Organization unsuspended successfully");
			},
			onError: (err) => {
				toast.error(handleApiError(err));
			},
		});
	}

	function handleDeleteOrg(orgId: string) {
		setSelectedOrgId(orgId);
		setDeleteDialogOpen(true);
	}

	function submitEditOrg() {
		if (!selectedOrgId) return;

		updateOrgMutation.mutate(
			{
				organizationId: selectedOrgId,
				name: editName,
				slug: editSlug,
			},
			{
				onSuccess: () => {
					toast.success("Organization updated successfully");
					setEditDialogOpen(false);
					setSelectedOrgId(null);
				},
				onError: (err) => {
					toast.error(handleApiError(err));
				},
			},
		);
	}

	function submitSuspendOrg() {
		if (!selectedOrgId || !suspendReason.trim()) return;

		suspendOrgMutation.mutate(
			{
				organizationId: selectedOrgId,
				reason: suspendReason,
			},
			{
				onSuccess: () => {
					toast.success("Organization suspended successfully");
					setSuspendDialogOpen(false);
					setSelectedOrgId(null);
					setSuspendReason("");
				},
				onError: (err) => {
					toast.error(handleApiError(err));
				},
			},
		);
	}

	function submitDeleteOrg() {
		if (!selectedOrgId) return;

		deleteOrgMutation.mutate(selectedOrgId, {
			onSuccess: () => {
				toast.success("Organization deleted successfully");
				setDeleteDialogOpen(false);
				setSelectedOrgId(null);
			},
			onError: (err) => {
				toast.error(handleApiError(err));
			},
		});
	}

	function handlePageChange(newPage: number) {
		setCurrentPage(newPage);
	}

	// Reset to first page when filters change
	function handleFilterChange(type: "status" | "plan", value: string) {
		setCurrentPage(1);
		if (type === "status") {
			setStatusFilter(value);
		} else {
			setPlanFilter(value);
		}
	}

	function handleSearchChange(value: string) {
		setSearchQuery(value);
		setCurrentPage(1);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Organizations</h1>
				<p className="text-muted-foreground text-sm">
					Manage all organizations on the platform.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Organizations</CardTitle>
					<CardDescription>
						A list of all registered organizations on the platform.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="mb-4 flex flex-col gap-4 sm:flex-row">
						<div className="relative flex-1">
							<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search organizations..."
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select
							value={statusFilter}
							onValueChange={(val) => handleFilterChange("status", val ?? "all")}
						>
							<SelectTrigger className="w-[150px]">
								<SelectValue>
									{statusFilter === "all" ? "Status" : statusFilter}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={planFilter}
							onValueChange={(val) => handleFilterChange("plan", val ?? "all")}
						>
							<SelectTrigger className="w-[150px]">
								<SelectValue>
									{planFilter === "all" ? "Plan" : planFilter}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Plans</SelectItem>
								<SelectItem value="free">Free</SelectItem>
								<SelectItem value="starter">Starter</SelectItem>
								<SelectItem value="pro">Pro</SelectItem>
								<SelectItem value="enterprise">Enterprise</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center gap-4 py-3">
									<Skeleton className="h-10 w-10" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-[200px]" />
										<Skeleton className="h-3 w-[100px]" />
									</div>
									<Skeleton className="h-6 w-16" />
									<Skeleton className="h-6 w-16" />
									<Skeleton className="h-4 w-8" />
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-8 w-8" />
								</div>
							))}
						</div>
					)}

					{/* Error State */}
					{isError && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<AlertTriangleIcon className="mb-4 size-12 text-destructive" />
							<h3 className="mb-2 font-medium text-lg">Failed to load organizations</h3>
							<p className="mb-4 text-muted-foreground text-sm">
								{handleApiError(error)}
							</p>
							<Button variant="outline" onClick={() => refetch()}>
								Try Again
							</Button>
						</div>
					)}

					{/* Empty State */}
					{!isLoading && !isError && organizations.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<BuildingIcon className="mb-4 size-12 text-muted-foreground" />
							<h3 className="mb-2 font-medium text-lg">No organizations found</h3>
							<p className="text-muted-foreground text-sm">
								{searchQuery || statusFilter !== "all" || planFilter !== "all"
									? "Try adjusting your search or filters."
									: "Organizations will appear here once created."}
							</p>
						</div>
					)}

					{/* Table */}
					{!isLoading && !isError && organizations.length > 0 && (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Organization</TableHead>
									<TableHead>Plan</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Members</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{organizations.map((org) => {
									const statusConfig = getStatusConfig(org.status);
									return (
										<TableRow key={org.id}>
											<TableCell>
												<div>
													<p className="font-medium text-sm">{org.name}</p>
													<p className="text-muted-foreground text-xs">
														/{org.slug}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={getPlanBadgeVariant(org.plan)}>
													{org.plan}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge className={statusConfig.color}>
													{statusConfig.label}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1.5">
													<UsersIcon className="size-3.5 text-muted-foreground" />
													{org.memberCount}
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{formatDate(org.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														render={<Button variant="ghost" size="icon-sm" />}
													>
														<MoreHorizontalIcon className="size-4" />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleViewOrg(org.id)}>
															<EyeIcon className="mr-2 size-4" />
															View Details
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => handleEditOrg(org)}>
															<PencilIcon className="mr-2 size-4" />
															Edit Organization
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														{org.status === "suspended" ? (
															<DropdownMenuItem
																onClick={() => handleUnsuspendOrg(org.id)}
															>
																<PlayIcon className="mr-2 size-4" />
																Unsuspend Organization
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																onClick={() => handleSuspendOrg(org.id)}
																disabled={org.status === "cancelled"}
															>
																<PauseIcon className="mr-2 size-4" />
																Suspend Organization
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => handleDeleteOrg(org.id)}
														>
															<TrashIcon className="mr-2 size-4" />
															Delete Organization
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}

					{/* Pagination */}
					{!isLoading && !isError && organizations.length > 0 && (
						<div className="mt-4 flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
								{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}{" "}
								organizations
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={currentPage === 1}
									onClick={() => handlePageChange(currentPage - 1)}
								>
									<ChevronLeftIcon className="size-4" />
									Previous
								</Button>
								<span className="text-muted-foreground text-sm">
									Page {currentPage} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={currentPage >= totalPages}
									onClick={() => handlePageChange(currentPage + 1)}
								>
									Next
									<ChevronRightIcon className="size-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* View Organization Dialog */}
			<Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Organization Details</DialogTitle>
						<DialogDescription>
							View detailed information about this organization.
						</DialogDescription>
					</DialogHeader>
					{selectedOrg ? (
						<div className="space-y-4">
							<div className="grid gap-4">
								<div>
									<Label className="text-muted-foreground text-xs">Name</Label>
									<p className="font-medium">{selectedOrg.name}</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Slug</Label>
									<p className="font-mono text-sm">/{selectedOrg.slug}</p>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-muted-foreground text-xs">Plan</Label>
										<Badge variant={getPlanBadgeVariant(selectedOrg.plan)} className="mt-1">
											{selectedOrg.plan}
										</Badge>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs">Status</Label>
										<Badge className={`mt-1 ${getStatusConfig(selectedOrg.status).color}`}>
											{getStatusConfig(selectedOrg.status).label}
										</Badge>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-muted-foreground text-xs">Members</Label>
										<p className="font-medium">{selectedOrg.memberCount}</p>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs">Created</Label>
										<p className="text-sm">{formatDate(selectedOrg.createdAt)}</p>
									</div>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Owner</Label>
									<p className="font-medium">{selectedOrg.owner.name}</p>
									<p className="text-muted-foreground text-sm">{selectedOrg.owner.email}</p>
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center py-8">
							<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setViewDialogOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Organization Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Organization</DialogTitle>
						<DialogDescription>
							Update the organization name and slug.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								placeholder="Organization name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-slug">Slug</Label>
							<Input
								id="edit-slug"
								value={editSlug}
								onChange={(e) => setEditSlug(e.target.value)}
								placeholder="organization-slug"
							/>
							<p className="text-muted-foreground text-xs">
								URL-friendly identifier (lowercase, hyphens only)
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={submitEditOrg}
							disabled={updateOrgMutation.isPending || !editName.trim()}
						>
							{updateOrgMutation.isPending && (
								<LoaderIcon className="mr-2 size-4 animate-spin" />
							)}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Suspend Organization Dialog */}
			<AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-amber-500/10">
							<PauseIcon className="size-6 text-amber-500" />
						</AlertDialogMedia>
						<AlertDialogTitle>Suspend Organization</AlertDialogTitle>
						<AlertDialogDescription>
							This will suspend the organization and prevent all members from
							accessing it. The organization can be unsuspended later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-2">
						<Label htmlFor="suspend-reason">Reason for suspension</Label>
						<Input
							id="suspend-reason"
							value={suspendReason}
							onChange={(e) => setSuspendReason(e.target.value)}
							placeholder="Enter reason for suspension"
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={submitSuspendOrg}
							disabled={suspendOrgMutation.isPending || !suspendReason.trim()}
							className="bg-amber-600 hover:bg-amber-700"
						>
							{suspendOrgMutation.isPending && (
								<LoaderIcon className="mr-2 size-4 animate-spin" />
							)}
							Suspend
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Organization Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10">
							<TrashIcon className="size-6 text-destructive" />
						</AlertDialogMedia>
						<AlertDialogTitle>Delete Organization</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the
							organization and all associated data including projects, tasks,
							and member associations.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={submitDeleteOrg}
							disabled={deleteOrgMutation.isPending}
							variant="destructive"
						>
							{deleteOrgMutation.isPending && (
								<LoaderIcon className="mr-2 size-4 animate-spin" />
							)}
							Delete Organization
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
