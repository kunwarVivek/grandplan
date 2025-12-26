import { useState } from "react";
import {
	Activity,
	Building2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Filter,
	Globe,
	Settings,
	User,
} from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "../hooks/use-admin";
import type { AuditLogEntry, AuditLogsFilters } from "../types";

type AuditLogTableProps = {
	className?: string;
	initialFilters?: AuditLogsFilters;
};

const ACTION_CATEGORIES = [
	{ value: "user.created", label: "User Created" },
	{ value: "user.updated", label: "User Updated" },
	{ value: "user.deleted", label: "User Deleted" },
	{ value: "user.suspended", label: "User Suspended" },
	{ value: "org.created", label: "Organization Created" },
	{ value: "org.updated", label: "Organization Updated" },
	{ value: "org.suspended", label: "Organization Suspended" },
	{ value: "plan.created", label: "Plan Created" },
	{ value: "plan.updated", label: "Plan Updated" },
	{ value: "system.config_changed", label: "System Config Changed" },
	{ value: "impersonation.started", label: "Impersonation Started" },
	{ value: "impersonation.ended", label: "Impersonation Ended" },
];

const PAGE_SIZE = 10;

export function AuditLogTable({
	className,
	initialFilters = {},
}: AuditLogTableProps) {
	const [filters, setFilters] = useState<AuditLogsFilters>({
		page: 1,
		limit: PAGE_SIZE,
		...initialFilters,
	});

	const { data, isLoading, error } = useAuditLogs(filters);

	const updateFilters = (updates: Partial<AuditLogsFilters>) => {
		setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
	};

	const handlePageChange = (newPage: number) => {
		setFilters((prev) => ({ ...prev, page: newPage }));
	};

	if (error) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Audit Log</CardTitle>
					<CardDescription>Unable to load audit logs</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const logs = data?.items ?? [];
	const totalPages = data?.totalPages ?? 1;
	const currentPage = data?.page ?? 1;

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Audit Log</CardTitle>
						<CardDescription>
							Platform activity and administrative actions
						</CardDescription>
					</div>
					<FilterControls filters={filters} onFilterChange={updateFilters} />
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<AuditLogTableSkeleton />
				) : logs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Activity className="size-12 text-muted-foreground/50 mb-4" />
						<p className="text-muted-foreground">No audit logs found</p>
						<p className="text-sm text-muted-foreground/75">
							Try adjusting your filters
						</p>
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[180px]">Timestamp</TableHead>
									<TableHead>Actor</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Target</TableHead>
									<TableHead className="w-[100px]">Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((log) => (
									<AuditLogRow key={log.id} log={log} />
								))}
							</TableBody>
						</Table>

						{/* Pagination */}
						<div className="flex items-center justify-between mt-4 pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages}
								{data?.total && ` (${data.total} total entries)`}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage <= 1}
								>
									<ChevronLeft className="size-4" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage >= totalPages}
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

type FilterControlsProps = {
	filters: AuditLogsFilters;
	onFilterChange: (updates: Partial<AuditLogsFilters>) => void;
};

function FilterControls({ filters, onFilterChange }: FilterControlsProps) {
	const [isOpen, setIsOpen] = useState(false);

	const hasActiveFilters =
		filters.action || filters.targetType || filters.startDate || filters.endDate;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				render={
					<Button variant="outline" size="sm" className="gap-2" />
				}
			>
				<Filter className="size-4" />
				Filters
				{hasActiveFilters && (
					<Badge variant="secondary" className="ml-1 h-5 px-1.5">
						{[
							filters.action,
							filters.targetType,
							filters.startDate,
							filters.endDate,
						].filter(Boolean).length}
					</Badge>
				)}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<div className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Action Type</label>
						<Select
							value={filters.action ?? ""}
							onValueChange={(value) =>
								onFilterChange({ action: value || undefined })
							}
						>
							<SelectTrigger>
								<SelectValue>
									{filters.action
										? ACTION_CATEGORIES.find((a) => a.value === filters.action)?.label
										: "All actions"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All actions</SelectItem>
								{ACTION_CATEGORIES.map((action) => (
									<SelectItem key={action.value} value={action.value}>
										{action.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Target Type</label>
						<Select
							value={filters.targetType ?? ""}
							onValueChange={(value) =>
								onFilterChange({
									targetType: (value as AuditLogEntry["target"]["type"]) || undefined,
								})
							}
						>
							<SelectTrigger>
								<SelectValue>
									{filters.targetType
										? filters.targetType.charAt(0).toUpperCase() + filters.targetType.slice(1)
										: "All targets"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All targets</SelectItem>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="organization">Organization</SelectItem>
								<SelectItem value="plan">Plan</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Date Range</label>
						<div className="grid grid-cols-2 gap-2">
							<Input
								type="date"
								placeholder="Start date"
								value={
									filters.startDate
										? new Date(filters.startDate).toISOString().split("T")[0]
										: ""
								}
								onChange={(e) =>
									onFilterChange({
										startDate: e.target.value
											? new Date(e.target.value)
											: undefined,
									})
								}
							/>
							<Input
								type="date"
								placeholder="End date"
								value={
									filters.endDate
										? new Date(filters.endDate).toISOString().split("T")[0]
										: ""
								}
								onChange={(e) =>
									onFilterChange({
										endDate: e.target.value
											? new Date(e.target.value)
											: undefined,
									})
								}
							/>
						</div>
					</div>

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							className="w-full"
							onClick={() =>
								onFilterChange({
									action: undefined,
									targetType: undefined,
									startDate: undefined,
									endDate: undefined,
								})
							}
						>
							Clear filters
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

type AuditLogRowProps = {
	log: AuditLogEntry;
};

function AuditLogRow({ log }: AuditLogRowProps) {
	const formatTimestamp = (date: Date) => {
		return new Date(date).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const getActorIcon = (type: AuditLogEntry["actor"]["type"]) => {
		switch (type) {
			case "user":
				return User;
			case "system":
				return Settings;
			case "api":
				return Globe;
			default:
				return User;
		}
	};

	const getTargetIcon = (type: AuditLogEntry["target"]["type"]) => {
		switch (type) {
			case "user":
				return User;
			case "organization":
				return Building2;
			case "plan":
				return Settings;
			case "system":
				return Settings;
			default:
				return Activity;
		}
	};

	const ActorIcon = getActorIcon(log.actor.type);
	const TargetIcon = getTargetIcon(log.target.type);

	const getActionBadgeColor = (action: string) => {
		if (action.includes("created")) return "bg-emerald-500/10 text-emerald-500";
		if (action.includes("deleted") || action.includes("suspended"))
			return "bg-red-500/10 text-red-500";
		if (action.includes("updated")) return "bg-blue-500/10 text-blue-500";
		return "bg-muted text-muted-foreground";
	};

	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-2 text-muted-foreground">
					<Clock className="size-3" />
					<span className="text-sm">{formatTimestamp(log.timestamp)}</span>
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<div className="size-6 rounded-full bg-muted flex items-center justify-center">
						<ActorIcon className="size-3" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium truncate">{log.actor.name}</p>
						<p className="text-xs text-muted-foreground truncate">
							{log.actor.email}
						</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<Badge className={cn("font-normal", getActionBadgeColor(log.action))}>
					{log.action.replace(/[._]/g, " ")}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<TargetIcon className="size-4 text-muted-foreground" />
					<div className="min-w-0">
						<p className="text-sm font-medium truncate">{log.target.name}</p>
						<p className="text-xs text-muted-foreground capitalize">
							{log.target.type}
						</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				{log.ipAddress && (
					<span className="text-xs text-muted-foreground font-mono">
						{log.ipAddress}
					</span>
				)}
			</TableCell>
		</TableRow>
	);
}

function AuditLogTableSkeleton() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[180px]">Timestamp</TableHead>
					<TableHead>Actor</TableHead>
					<TableHead>Action</TableHead>
					<TableHead>Target</TableHead>
					<TableHead className="w-[100px]">Details</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 5 }).map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<Skeleton className="h-4 w-28" />
						</TableCell>
						<TableCell>
							<div className="flex items-center gap-2">
								<Skeleton className="size-6 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</div>
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-24" />
						</TableCell>
						<TableCell>
							<div className="flex items-center gap-2">
								<Skeleton className="size-4" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="h-3 w-16" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
