import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	Archive,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Copy,
	Loader2,
	MoreHorizontal,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import {
	useBulkArchiveTasks,
	useBulkDeleteTasks,
	useBulkDuplicateTasks,
} from "../hooks/use-tasks";
import {
	TASK_PRIORITY_CONFIG as PRIORITY_CONFIG,
	TASK_STATUS_CONFIG as STATUS_CONFIG,
	type Task,
	type TaskPriority,
	type TaskStatus,
} from "../types";

// ============================================
// VIEW PROPS TYPE
// ============================================

type ViewProps = {
	tasks: Task[];
	onTaskClick: (taskId: string) => void;
	onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
	onTaskCreate: (status?: TaskStatus) => void;
	isLoading?: boolean;
	// Infinite scroll props (optional for backward compatibility)
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	fetchNextPage?: () => void;
	totalCount?: number;
};

// ============================================
// STATUS SELECT COMPONENT
// ============================================

interface StatusSelectProps {
	value: TaskStatus;
	onChange: (value: TaskStatus) => void;
}

function StatusSelect({ value, onChange }: StatusSelectProps) {
	const config = STATUS_CONFIG[value];
	const statuses: TaskStatus[] = [
		"backlog",
		"todo",
		"in_progress",
		"in_review",
		"blocked",
		"completed",
		"cancelled",
	];

	return (
		<Select value={value} onValueChange={(v) => onChange(v as TaskStatus)}>
			<SelectTrigger
				size="sm"
				className={cn("h-7 w-28", config.bgColor, config.color)}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{statuses.map((status) => {
					const statusConfig = STATUS_CONFIG[status];
					return (
						<SelectItem key={status} value={status}>
							<span className={statusConfig.color}>{statusConfig.label}</span>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}

// ============================================
// PRIORITY SELECT COMPONENT
// ============================================

interface PrioritySelectProps {
	value: TaskPriority;
	onChange: (value: TaskPriority) => void;
}

function PrioritySelect({ value, onChange }: PrioritySelectProps) {
	const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

	return (
		<Select value={value} onValueChange={(v) => onChange(v as TaskPriority)}>
			<SelectTrigger size="sm" className="h-7 w-24">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{priorities.map((priority) => {
					const priorityConfig = PRIORITY_CONFIG[priority];
					return (
						<SelectItem key={priority} value={priority}>
							<span className={priorityConfig.color}>
								{priorityConfig.icon} {priorityConfig.label}
							</span>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}

// ============================================
// BULK ACTIONS TOOLBAR
// ============================================

interface BulkActionsToolbarProps {
	selectedCount: number;
	onDelete: () => void;
	onDuplicate: () => void;
	onArchive: () => void;
	onClearSelection: () => void;
}

function BulkActionsToolbar({
	selectedCount,
	onDelete,
	onDuplicate,
	onArchive,
	onClearSelection,
}: BulkActionsToolbarProps) {
	if (selectedCount === 0) return null;

	return (
		<div className="flex items-center gap-2 rounded border bg-muted/50 px-3 py-2">
			<span className="font-medium text-sm">
				{selectedCount} task{selectedCount > 1 ? "s" : ""} selected
			</span>
			<div className="ml-4 flex items-center gap-1">
				<Button variant="outline" size="sm" onClick={onDuplicate}>
					<Copy className="mr-1 h-4 w-4" />
					Duplicate
				</Button>
				<Button variant="outline" size="sm" onClick={onArchive}>
					<Archive className="mr-1 h-4 w-4" />
					Archive
				</Button>
				<Button variant="destructive" size="sm" onClick={onDelete}>
					<Trash2 className="mr-1 h-4 w-4" />
					Delete
				</Button>
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={onClearSelection}
				className="ml-auto"
			>
				Clear selection
			</Button>
		</div>
	);
}

// ============================================
// LOADING SKELETON
// ============================================

function ListSkeleton() {
	return (
		<div className="flex flex-col gap-2 p-4">
			<Skeleton className="h-10 w-full" />
			{[1, 2, 3, 4, 5].map((i) => (
				<Skeleton key={i} className="h-12 w-full" />
			))}
		</div>
	);
}

// ============================================
// LIST VIEW COMPONENT
// ============================================

export function ListView({
	tasks,
	onTaskClick,
	onTaskUpdate,
	onTaskCreate,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	totalCount,
}: ViewProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	// Infinite scroll: intersection observer for loading more
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const isInfiniteScrollEnabled = Boolean(fetchNextPage);

	useEffect(() => {
		if (!isInfiniteScrollEnabled || !loadMoreRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage?.();
				}
			},
			{ threshold: 0.1, rootMargin: "100px" },
		);

		observer.observe(loadMoreRef.current);
		return () => observer.disconnect();
	}, [isInfiniteScrollEnabled, hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Define columns
	const columns = useMemo<ColumnDef<Task>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={!!table.getIsAllPageRowsSelected()}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
				size: 40,
			},
			{
				accessorKey: "title",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
							className="-ml-3"
						>
							Title
							{column.getIsSorted() === "asc" ? (
								<ArrowUp className="ml-1 h-4 w-4" />
							) : column.getIsSorted() === "desc" ? (
								<ArrowDown className="ml-1 h-4 w-4" />
							) : (
								<ArrowUpDown className="ml-1 h-4 w-4" />
							)}
						</Button>
					);
				},
				cell: ({ row }) => (
					<button
						type="button"
						onClick={() => onTaskClick(row.original.id)}
						className="max-w-[300px] truncate text-left font-medium hover:underline"
					>
						{row.original.title}
					</button>
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-3"
					>
						Status
						{column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-1 h-4 w-4" />
						) : column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-1 h-4 w-4" />
						) : (
							<ArrowUpDown className="ml-1 h-4 w-4" />
						)}
					</Button>
				),
				cell: ({ row }) => (
					<StatusSelect
						value={row.original.status}
						onChange={(status) => onTaskUpdate(row.original.id, { status })}
					/>
				),
			},
			{
				accessorKey: "priority",
				header: ({ column }) => (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-3"
					>
						Priority
						{column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-1 h-4 w-4" />
						) : column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-1 h-4 w-4" />
						) : (
							<ArrowUpDown className="ml-1 h-4 w-4" />
						)}
					</Button>
				),
				cell: ({ row }) => (
					<PrioritySelect
						value={row.original.priority}
						onChange={(priority) => onTaskUpdate(row.original.id, { priority })}
					/>
				),
			},
			{
				accessorKey: "assignee",
				header: "Assignee",
				cell: ({ row }) => {
					const assignee = row.original.assignee;
					if (!assignee) {
						return <span className="text-muted-foreground">Unassigned</span>;
					}
					return (
						<div className="flex items-center gap-2">
							{assignee.avatar ? (
								<img
									src={assignee.avatar}
									alt={assignee.name}
									className="h-6 w-6 rounded-full"
								/>
							) : (
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 font-medium text-primary text-xs">
									{assignee.name.charAt(0)}
								</div>
							)}
							<span className="truncate">{assignee.name}</span>
						</div>
					);
				},
			},
			{
				accessorKey: "dueDate",
				header: ({ column }) => (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-3"
					>
						Due Date
						{column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-1 h-4 w-4" />
						) : column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-1 h-4 w-4" />
						) : (
							<ArrowUpDown className="ml-1 h-4 w-4" />
						)}
					</Button>
				),
				cell: ({ row }) => {
					const dueDate = row.original.dueDate;
					if (!dueDate) {
						return <span className="text-muted-foreground">-</span>;
					}
					const isOverdue =
						new Date(dueDate) < new Date() &&
						row.original.status !== "completed";
					return (
						<span className={cn(isOverdue && "font-medium text-red-500")}>
							{format(new Date(dueDate), "MMM d, yyyy")}
						</span>
					);
				},
				sortingFn: (rowA, rowB) => {
					const a = rowA.original.dueDate;
					const b = rowB.original.dueDate;
					if (!a && !b) return 0;
					if (!a) return 1;
					if (!b) return -1;
					return new Date(a).getTime() - new Date(b).getTime();
				},
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="ghost" size="icon-xs">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => onTaskClick(row.original.id)}>
								View details
							</DropdownMenuItem>
							<DropdownMenuItem>Edit</DropdownMenuItem>
							<DropdownMenuItem>Duplicate</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive">
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
				enableSorting: false,
				enableHiding: false,
				size: 40,
			},
		],
		[onTaskClick, onTaskUpdate],
	);

	const table = useReactTable({
		data: tasks,
		columns,
		state: {
			sorting,
			rowSelection,
		},
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			pagination: {
				pageSize: 20,
			},
		},
	});

	const selectedRowIds = useMemo(
		() => Object.keys(rowSelection).filter((id) => rowSelection[id]),
		[rowSelection],
	);

	const projectId = tasks[0]?.projectId ?? "";

	const bulkDelete = useBulkDeleteTasks(projectId);
	const bulkArchive = useBulkArchiveTasks(projectId);
	const bulkDuplicate = useBulkDuplicateTasks(projectId);

	const handleBulkDelete = useCallback(() => {
		if (!projectId || selectedRowIds.length === 0) return;
		bulkDelete.mutate(selectedRowIds, {
			onSuccess: () => {
				toast.success("Tasks deleted", {
					description: `${selectedRowIds.length} task(s) have been deleted`,
				});
				setRowSelection({});
			},
			onError: (error) => {
				toast.error("Failed to delete tasks", {
					description: error.message,
				});
			},
		});
	}, [selectedRowIds, projectId, bulkDelete]);

	const handleBulkDuplicate = useCallback(() => {
		if (!projectId || selectedRowIds.length === 0) return;
		bulkDuplicate.mutate(selectedRowIds, {
			onSuccess: (data) => {
				toast.success("Tasks duplicated", {
					description: `${data.data.duplicated.length} task(s) have been duplicated`,
				});
				setRowSelection({});
			},
			onError: (error) => {
				toast.error("Failed to duplicate tasks", {
					description: error.message,
				});
			},
		});
	}, [selectedRowIds, projectId, bulkDuplicate]);

	const handleBulkArchive = useCallback(() => {
		if (!projectId || selectedRowIds.length === 0) return;
		bulkArchive.mutate(selectedRowIds, {
			onSuccess: () => {
				toast.success("Tasks archived", {
					description: `${selectedRowIds.length} task(s) have been archived`,
				});
				setRowSelection({});
			},
			onError: (error) => {
				toast.error("Failed to archive tasks", {
					description: error.message,
				});
			},
		});
	}, [selectedRowIds, projectId, bulkArchive]);

	if (isLoading) {
		return <ListSkeleton />;
	}

	return (
		<div className="flex h-full flex-col">
			{/* Toolbar */}
			<div className="flex items-center gap-2 border-b p-3">
				<BulkActionsToolbar
					selectedCount={selectedRowIds.length}
					onDelete={handleBulkDelete}
					onDuplicate={handleBulkDuplicate}
					onArchive={handleBulkArchive}
					onClearSelection={() => setRowSelection({})}
				/>
				{selectedRowIds.length === 0 && (
					<>
						<div className="flex-1" />
						<Button size="sm" onClick={() => onTaskCreate()}>
							<Plus className="mr-1 h-4 w-4" />
							Add Task
						</Button>
					</>
				)}
			</div>

			{/* Table */}
			<div className="flex-1 overflow-auto">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{
											width:
												header.getSize() !== 150 ? header.getSize() : undefined,
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length > 0 ? (
							<>
								{table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() ? "selected" : undefined}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))}
								{/* Infinite scroll trigger */}
								{isInfiniteScrollEnabled && (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-12 text-center"
										>
											<div
												ref={loadMoreRef}
												className="flex items-center justify-center"
											>
												{isFetchingNextPage ? (
													<div className="flex items-center gap-2 text-muted-foreground text-sm">
														<Loader2 className="h-4 w-4 animate-spin" />
														Loading more...
													</div>
												) : hasNextPage ? (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => fetchNextPage?.()}
													>
														Load more
													</Button>
												) : (
													<span className="text-muted-foreground text-sm">
														All tasks loaded
													</span>
												)}
											</div>
										</TableCell>
									</TableRow>
								)}
							</>
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-48 text-center"
								>
									<div className="flex flex-col items-center gap-2 text-muted-foreground">
										<p>No tasks found</p>
										<Button
											variant="outline"
											size="sm"
											onClick={() => onTaskCreate()}
										>
											<Plus className="mr-1 h-4 w-4" />
											Create your first task
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Footer: Infinite scroll info or traditional pagination */}
			<div className="flex items-center justify-between border-t px-4 py-3">
				<div className="text-muted-foreground text-sm">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{isInfiniteScrollEnabled
						? `${tasks.length}${totalCount !== undefined ? ` (${totalCount} total)` : ""}`
						: table.getFilteredRowModel().rows.length}{" "}
					row(s) selected
				</div>
				{/* Show traditional pagination controls only when not in infinite scroll mode */}
				{!isInfiniteScrollEnabled && (
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1 text-sm">
							<span>Rows per page:</span>
							<Select
								value={String(table.getState().pagination.pageSize)}
								onValueChange={(value) => table.setPageSize(Number(value))}
							>
								<SelectTrigger size="sm" className="h-7 w-16">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[10, 20, 30, 50, 100].map((size) => (
										<SelectItem key={size} value={String(size)}>
											{size}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-1 text-sm">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon-xs"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronsLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon-xs"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon-xs"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon-xs"
								onClick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
				{/* Show load status for infinite scroll mode */}
				{isInfiniteScrollEnabled && (
					<div className="text-muted-foreground text-sm">
						{isFetchingNextPage
							? "Loading..."
							: hasNextPage
								? "Scroll for more"
								: `${tasks.length} tasks loaded`}
					</div>
				)}
			</div>
		</div>
	);
}
