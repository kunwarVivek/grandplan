import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
	SearchIcon,
} from "lucide-react";
import { useState } from "react";

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

export const Route = createFileRoute("/_authenticated/admin/organizations")({
	component: AdminOrganizations,
});

interface Organization {
	id: string;
	name: string;
	slug: string;
	plan: "free" | "pro" | "enterprise";
	status: "active" | "suspended";
	members: number;
	createdAt: string;
}

function AdminOrganizations() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [planFilter, setPlanFilter] = useState<string>("all");

	const organizations: Organization[] = [
		{
			id: "1",
			name: "Acme Corporation",
			slug: "acme-corp",
			plan: "enterprise",
			status: "active",
			members: 45,
			createdAt: "Jan 10, 2024",
		},
		{
			id: "2",
			name: "Tech Startup Inc.",
			slug: "tech-startup",
			plan: "pro",
			status: "active",
			members: 12,
			createdAt: "Feb 15, 2024",
		},
		{
			id: "3",
			name: "Design Agency Ltd.",
			slug: "design-agency",
			plan: "pro",
			status: "active",
			members: 8,
			createdAt: "Mar 5, 2024",
		},
		{
			id: "4",
			name: "Small Business Co.",
			slug: "small-business",
			plan: "free",
			status: "suspended",
			members: 3,
			createdAt: "Apr 20, 2024",
		},
		{
			id: "5",
			name: "Creative Studio",
			slug: "creative-studio",
			plan: "free",
			status: "active",
			members: 5,
			createdAt: "May 8, 2024",
		},
	];

	const filteredOrganizations = organizations.filter((org) => {
		const matchesSearch =
			org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			org.slug.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === "all" || org.status === statusFilter;
		const matchesPlan = planFilter === "all" || org.plan === planFilter;
		return matchesSearch && matchesStatus && matchesPlan;
	});

	function getPlanBadgeVariant(plan: string) {
		switch (plan) {
			case "enterprise":
				return "default";
			case "pro":
				return "secondary";
			default:
				return "outline";
		}
	}

	function handleViewOrg(orgId: string) {
		console.log("View organization:", orgId);
	}

	function handleEditOrg(orgId: string) {
		console.log("Edit organization:", orgId);
	}

	function handleSuspendOrg(orgId: string) {
		console.log("Suspend organization:", orgId);
	}

	function handleDeleteOrg(orgId: string) {
		console.log("Delete organization:", orgId);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Organizations</h1>
				<p className="text-sm text-muted-foreground">
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
					<div className="mb-4 flex flex-col gap-4 sm:flex-row">
						<div className="relative flex-1">
							<SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search organizations..."
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
								<SelectItem value="suspended">Suspended</SelectItem>
							</SelectContent>
						</Select>
						<Select value={planFilter} onValueChange={(val) => setPlanFilter(val ?? "all")}>
							<SelectTrigger className="w-[150px]">
								<SelectValue>{planFilter === "all" ? "Plan" : planFilter}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Plans</SelectItem>
								<SelectItem value="free">Free</SelectItem>
								<SelectItem value="pro">Pro</SelectItem>
								<SelectItem value="enterprise">Enterprise</SelectItem>
							</SelectContent>
						</Select>
					</div>

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
							{filteredOrganizations.map((org) => (
								<TableRow key={org.id}>
									<TableCell>
										<div>
											<p className="text-sm font-medium">{org.name}</p>
											<p className="text-xs text-muted-foreground">
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
										<Badge
											variant={
												org.status === "active" ? "default" : "destructive"
											}
										>
											{org.status}
										</Badge>
									</TableCell>
									<TableCell>{org.members}</TableCell>
									<TableCell className="text-muted-foreground">
										{org.createdAt}
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
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleEditOrg(org.id)}>
													Edit Organization
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleSuspendOrg(org.id)}
													disabled={org.status === "suspended"}
												>
													Suspend Organization
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDeleteOrg(org.id)}
												>
													Delete Organization
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
							Showing {filteredOrganizations.length} of {organizations.length}{" "}
							organizations
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
