import {
	CalendarIcon,
	FilterIcon,
	GanttChartIcon,
	KanbanIcon,
	LayoutListIcon,
	ListTreeIcon,
	SearchIcon,
	UserIcon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTaskViewMode, useUIStore } from "@/stores";
import type { TaskFilters, TaskPriority, TaskStatus } from "../types";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../types";

type TaskFiltersProps = {
	filters: TaskFilters;
	onFiltersChange: (filters: TaskFilters) => void;
	assignees?: Array<{ id: string; name: string; image?: string | null }>;
	className?: string;
};

type ViewMode = "kanban" | "tree" | "list" | "timeline";

const VIEW_MODES: Array<{
	id: ViewMode;
	label: string;
	icon: React.ReactNode;
}> = [
	{ id: "kanban", label: "Kanban", icon: <KanbanIcon className="size-4" /> },
	{ id: "tree", label: "Tree", icon: <ListTreeIcon className="size-4" /> },
	{ id: "list", label: "List", icon: <LayoutListIcon className="size-4" /> },
	{
		id: "timeline",
		label: "Timeline",
		icon: <GanttChartIcon className="size-4" />,
	},
];

export function TaskFilters({
	filters,
	onFiltersChange,
	assignees = [],
	className,
}: TaskFiltersProps) {
	const viewMode = useTaskViewMode();
	const setTaskViewMode = useUIStore((state) => state.setTaskViewMode);
	const [searchValue, setSearchValue] = useState(filters.search ?? "");

	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.status?.length) count += 1;
		if (filters.priority?.length) count += 1;
		if (filters.assigneeId?.length) count += 1;
		if (filters.dueDateFrom || filters.dueDateTo) count += 1;
		if (filters.createdAfter || filters.createdBefore) count += 1;
		return count;
	}, [filters]);

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
	};

	const handleSearchSubmit = () => {
		onFiltersChange({ ...filters, search: searchValue || undefined });
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearchSubmit();
		}
	};

	const handleStatusToggle = (status: TaskStatus) => {
		const current = filters.status ?? [];
		const updated = current.includes(status)
			? current.filter((s) => s !== status)
			: [...current, status];
		onFiltersChange({
			...filters,
			status: updated.length ? updated : undefined,
		});
	};

	const handlePriorityToggle = (priority: TaskPriority) => {
		const current = filters.priority ?? [];
		const updated = current.includes(priority)
			? current.filter((p) => p !== priority)
			: [...current, priority];
		onFiltersChange({
			...filters,
			priority: updated.length ? updated : undefined,
		});
	};

	const handleAssigneeToggle = (assigneeId: string) => {
		const current = filters.assigneeId ?? [];
		const updated = current.includes(assigneeId)
			? current.filter((a) => a !== assigneeId)
			: [...current, assigneeId];
		onFiltersChange({
			...filters,
			assigneeId: updated.length ? updated : undefined,
		});
	};

	const handleDateChange = (
		field: "dueDateFrom" | "dueDateTo",
		value: string,
	) => {
		onFiltersChange({
			...filters,
			[field]: value ? new Date(value) : undefined,
		});
	};

	const clearFilters = () => {
		setSearchValue("");
		onFiltersChange({});
	};

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex flex-wrap items-center gap-2">
				{/* Search */}
				<div className="relative min-w-48 max-w-xs flex-1">
					<SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchValue}
						onChange={(e) => handleSearchChange(e.target.value)}
						onKeyDown={handleSearchKeyDown}
						onBlur={handleSearchSubmit}
						placeholder="Search tasks..."
						className="h-8 pl-8"
					/>
				</div>

				<Separator orientation="vertical" className="h-6" />

				{/* Status filter */}
				<Popover>
					<PopoverTrigger>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								filters.status?.length && "border-primary text-primary",
							)}
						>
							Status
							{filters.status?.length ? (
								<Badge
									variant="secondary"
									className="ml-1.5 h-4 px-1.5 text-[10px]"
								>
									{filters.status.length}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-48 p-2">
						<ScrollArea className="max-h-64">
							<div className="space-y-1">
								{Object.entries(TASK_STATUS_CONFIG).map(([value, config]) => (
									<label
										key={value}
										className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 hover:bg-muted"
									>
										<Checkbox
											checked={
												filters.status?.includes(value as TaskStatus) ?? false
											}
											onCheckedChange={() =>
												handleStatusToggle(value as TaskStatus)
											}
										/>
										<span className="text-xs">{config.label}</span>
									</label>
								))}
							</div>
						</ScrollArea>
					</PopoverContent>
				</Popover>

				{/* Priority filter */}
				<Popover>
					<PopoverTrigger>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								filters.priority?.length && "border-primary text-primary",
							)}
						>
							Priority
							{filters.priority?.length ? (
								<Badge
									variant="secondary"
									className="ml-1.5 h-4 px-1.5 text-[10px]"
								>
									{filters.priority.length}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-48 p-2">
						<ScrollArea className="max-h-64">
							<div className="space-y-1">
								{Object.entries(TASK_PRIORITY_CONFIG).map(([value, config]) => (
									<label
										key={value}
										className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 hover:bg-muted"
									>
										<Checkbox
											checked={
												filters.priority?.includes(value as TaskPriority) ??
												false
											}
											onCheckedChange={() =>
												handlePriorityToggle(value as TaskPriority)
											}
										/>
										<span className="text-xs">{config.label}</span>
									</label>
								))}
							</div>
						</ScrollArea>
					</PopoverContent>
				</Popover>

				{/* Assignee filter */}
				<Popover>
					<PopoverTrigger>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								filters.assigneeId?.length && "border-primary text-primary",
							)}
						>
							<UserIcon className="size-3.5" />
							Assignee
							{filters.assigneeId?.length ? (
								<Badge
									variant="secondary"
									className="ml-1.5 h-4 px-1.5 text-[10px]"
								>
									{filters.assigneeId.length}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-56 p-2">
						{assignees.length > 0 ? (
							<ScrollArea className="max-h-64">
								<div className="space-y-1">
									{assignees.map((assignee) => (
										<label
											key={assignee.id}
											className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 hover:bg-muted"
										>
											<Checkbox
												checked={
													filters.assigneeId?.includes(assignee.id) ?? false
												}
												onCheckedChange={() =>
													handleAssigneeToggle(assignee.id)
												}
											/>
											<span className="truncate text-xs">{assignee.name}</span>
										</label>
									))}
								</div>
							</ScrollArea>
						) : (
							<p className="py-4 text-center text-muted-foreground text-xs">
								No team members found
							</p>
						)}
					</PopoverContent>
				</Popover>

				{/* Date range filter */}
				<Popover>
					<PopoverTrigger>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								(filters.dueDateFrom || filters.dueDateTo) &&
									"border-primary text-primary",
							)}
						>
							<CalendarIcon className="size-3.5" />
							Due Date
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-64 p-3">
						<div className="space-y-3">
							<div className="space-y-1.5">
								<Label className="text-muted-foreground text-xs">From</Label>
								<Input
									type="date"
									value={filters.dueDateFrom?.toISOString().split("T")[0] ?? ""}
									onChange={(e) =>
										handleDateChange("dueDateFrom", e.target.value)
									}
									className="h-8"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-muted-foreground text-xs">To</Label>
								<Input
									type="date"
									value={filters.dueDateTo?.toISOString().split("T")[0] ?? ""}
									onChange={(e) =>
										handleDateChange("dueDateTo", e.target.value)
									}
									className="h-8"
								/>
							</div>
						</div>
					</PopoverContent>
				</Popover>

				{/* More filters button (for future expansion) */}
				<Popover>
					<PopoverTrigger>
						<Button variant="outline" size="sm">
							<FilterIcon className="size-3.5" />
							More
							{activeFilterCount > 0 ? (
								<Badge
									variant="secondary"
									className="ml-1.5 h-4 px-1.5 text-[10px]"
								>
									{activeFilterCount}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-72 p-3">
						<div className="space-y-4">
							<div>
								<Label className="text-muted-foreground text-xs">
									Created After
								</Label>
								<Input
									type="date"
									className="mt-1 h-8"
									value={
										filters.createdAfter?.toISOString().split("T")[0] ?? ""
									}
									onChange={(e) =>
										onFiltersChange({
											...filters,
											createdAfter: e.target.value
												? new Date(e.target.value)
												: undefined,
										})
									}
								/>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">
									Created Before
								</Label>
								<Input
									type="date"
									className="mt-1 h-8"
									value={
										filters.createdBefore?.toISOString().split("T")[0] ?? ""
									}
									onChange={(e) =>
										onFiltersChange({
											...filters,
											createdBefore: e.target.value
												? new Date(e.target.value)
												: undefined,
										})
									}
								/>
							</div>
							{(filters.createdAfter || filters.createdBefore) && (
								<Button
									variant="ghost"
									size="sm"
									className="w-full"
									onClick={() =>
										onFiltersChange({
											...filters,
											createdAfter: undefined,
											createdBefore: undefined,
										})
									}
								>
									Clear date filters
								</Button>
							)}
						</div>
					</PopoverContent>
				</Popover>

				{/* Clear filters */}
				{activeFilterCount > 0 && (
					<Button variant="ghost" size="sm" onClick={clearFilters}>
						<XIcon className="size-3.5" />
						Clear filters
					</Button>
				)}

				{/* Spacer */}
				<div className="flex-1" />

				{/* View mode selector */}
				<div className="flex items-center rounded-none border border-border">
					{VIEW_MODES.map((mode) => (
						<Button
							key={mode.id}
							variant={viewMode === mode.id ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setTaskViewMode(mode.id)}
							title={mode.label}
							className={cn(
								"rounded-none border-0",
								viewMode === mode.id && "bg-muted",
							)}
						>
							{mode.icon}
						</Button>
					))}
				</div>
			</div>

			{/* Active filters display */}
			{activeFilterCount > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-muted-foreground text-xs">Active filters:</span>

					{filters.status?.map((status) => (
						<Badge key={status} variant="secondary" className="gap-1 pr-1">
							{TASK_STATUS_CONFIG[status].label}
							<button
								type="button"
								onClick={() => handleStatusToggle(status)}
								className="rounded-none p-0.5 hover:bg-muted-foreground/20"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}

					{filters.priority?.map((priority) => (
						<Badge key={priority} variant="secondary" className="gap-1 pr-1">
							{TASK_PRIORITY_CONFIG[priority].label}
							<button
								type="button"
								onClick={() => handlePriorityToggle(priority)}
								className="rounded-none p-0.5 hover:bg-muted-foreground/20"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}

					{filters.assigneeId?.map((assigneeId) => {
						const assignee = assignees.find((a) => a.id === assigneeId);
						return (
							<Badge
								key={assigneeId}
								variant="secondary"
								className="gap-1 pr-1"
							>
								{assignee?.name ?? "Unknown"}
								<button
									type="button"
									onClick={() => handleAssigneeToggle(assigneeId)}
									className="rounded-none p-0.5 hover:bg-muted-foreground/20"
								>
									<XIcon className="size-3" />
								</button>
							</Badge>
						);
					})}

					{(filters.dueDateFrom || filters.dueDateTo) && (
						<Badge variant="secondary" className="gap-1 pr-1">
							{filters.dueDateFrom && filters.dueDateTo
								? `${filters.dueDateFrom.toLocaleDateString()} - ${filters.dueDateTo.toLocaleDateString()}`
								: filters.dueDateFrom
									? `From ${filters.dueDateFrom.toLocaleDateString()}`
									: `Until ${filters.dueDateTo?.toLocaleDateString()}`}
							<button
								type="button"
								onClick={() =>
									onFiltersChange({
										...filters,
										dueDateFrom: undefined,
										dueDateTo: undefined,
									})
								}
								className="rounded-none p-0.5 hover:bg-muted-foreground/20"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					)}
				</div>
			)}
		</div>
	);
}
