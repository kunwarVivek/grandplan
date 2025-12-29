import {
	addDays,
	addMonths,
	addWeeks,
	differenceInDays,
	eachDayOfInterval,
	eachWeekOfInterval,
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	isToday,
	isWithinInterval,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import {
	ArrowRight,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Plus,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	TASK_PRIORITY_CONFIG as PRIORITY_CONFIG,
	TASK_STATUS_CONFIG as STATUS_CONFIG,
	type Task,
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
};

// ============================================
// ZOOM LEVELS
// ============================================

type ZoomLevel = "day" | "week" | "month";

const ZOOM_CONFIG: Record<
	ZoomLevel,
	{ cellWidth: number; label: string; dateFormat: string }
> = {
	day: { cellWidth: 40, label: "Day", dateFormat: "d" },
	week: { cellWidth: 100, label: "Week", dateFormat: "MMM d" },
	month: { cellWidth: 120, label: "Month", dateFormat: "MMM yyyy" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTimelineRange(
	tasks: Task[],
	zoomLevel: ZoomLevel,
): { start: Date; end: Date } {
	const now = new Date();
	let minDate = now;
	let maxDate = addMonths(now, 1);

	for (const task of tasks) {
		if (task.startDate && new Date(task.startDate) < minDate) {
			minDate = new Date(task.startDate);
		}
		if (task.dueDate && new Date(task.dueDate) > maxDate) {
			maxDate = new Date(task.dueDate);
		}
	}

	// Add padding based on zoom level
	switch (zoomLevel) {
		case "day":
			minDate = addDays(startOfDay(minDate), -7);
			maxDate = addDays(endOfDay(maxDate), 14);
			break;
		case "week":
			minDate = addWeeks(startOfWeek(minDate), -1);
			maxDate = addWeeks(endOfWeek(maxDate), 2);
			break;
		case "month":
			minDate = addMonths(startOfMonth(minDate), -1);
			maxDate = addMonths(endOfMonth(maxDate), 2);
			break;
	}

	return { start: minDate, end: maxDate };
}

function getTimelineCells(
	start: Date,
	end: Date,
	zoomLevel: ZoomLevel,
): Date[] {
	switch (zoomLevel) {
		case "day":
			return eachDayOfInterval({ start, end });
		case "week":
			return eachWeekOfInterval({ start, end });
		case "month": {
			const cells: Date[] = [];
			let current = startOfMonth(start);
			while (current <= end) {
				cells.push(current);
				current = addMonths(current, 1);
			}
			return cells;
		}
		default:
			return eachDayOfInterval({ start, end });
	}
}

function getTaskPosition(
	task: Task,
	timelineStart: Date,
	zoomLevel: ZoomLevel,
	cellWidth: number,
): { left: number; width: number } | null {
	const startDate = task.startDate ? new Date(task.startDate) : null;
	const endDate = task.dueDate ? new Date(task.dueDate) : null;

	if (!startDate && !endDate) return null;

	const effectiveStart = startDate || endDate!;
	const effectiveEnd = endDate || startDate!;

	let leftOffset: number;
	let widthInCells: number;

	switch (zoomLevel) {
		case "day":
			leftOffset = differenceInDays(effectiveStart, timelineStart);
			widthInCells = Math.max(
				1,
				differenceInDays(effectiveEnd, effectiveStart) + 1,
			);
			break;
		case "week":
			leftOffset = differenceInDays(effectiveStart, timelineStart) / 7;
			widthInCells = Math.max(
				1,
				differenceInDays(effectiveEnd, effectiveStart) / 7 + 1,
			);
			break;
		case "month":
			leftOffset = differenceInDays(effectiveStart, timelineStart) / 30;
			widthInCells = Math.max(
				1,
				differenceInDays(effectiveEnd, effectiveStart) / 30 + 1,
			);
			break;
		default:
			leftOffset = differenceInDays(effectiveStart, timelineStart);
			widthInCells = Math.max(
				1,
				differenceInDays(effectiveEnd, effectiveStart) + 1,
			);
	}

	return {
		left: leftOffset * cellWidth,
		width: widthInCells * cellWidth - 4, // Subtract padding
	};
}

// ============================================
// TIMELINE HEADER
// ============================================

interface TimelineHeaderProps {
	cells: Date[];
	zoomLevel: ZoomLevel;
	cellWidth: number;
}

function TimelineHeader({ cells, zoomLevel, cellWidth }: TimelineHeaderProps) {
	const config = ZOOM_CONFIG[zoomLevel];

	return (
		<div className="sticky top-0 z-10 flex border-b bg-background">
			{/* Task Column Header */}
			<div className="sticky left-0 z-20 w-64 shrink-0 border-r bg-background p-2">
				<span className="font-medium text-sm">Tasks</span>
			</div>

			{/* Time Headers */}
			<div className="flex">
				{cells.map((cell, index) => {
					const isCurrentDay = zoomLevel === "day" && isToday(cell);
					const isCurrentWeek =
						zoomLevel === "week" &&
						isWithinInterval(new Date(), {
							start: cell,
							end: addDays(cell, 6),
						});

					return (
						<div
							key={index}
							className={cn(
								"shrink-0 border-r p-2 text-center text-xs",
								(isCurrentDay || isCurrentWeek) && "bg-primary/10",
							)}
							style={{ width: cellWidth }}
						>
							<span
								className={cn(
									"font-medium",
									(isCurrentDay || isCurrentWeek) && "text-primary",
								)}
							>
								{format(cell, config.dateFormat)}
							</span>
							{zoomLevel === "day" && (
								<div className="text-muted-foreground">
									{format(cell, "EEE")}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ============================================
// TIMELINE TASK ROW
// ============================================

interface TimelineTaskRowProps {
	task: Task;
	position: { left: number; width: number } | null;
	cells: Date[];
	cellWidth: number;
	onClick: () => void;
	onDragEnd?: (newStart: Date, newEnd: Date) => void;
}

function TimelineTaskRow({
	task,
	position,
	cells,
	cellWidth,
	onClick,
}: TimelineTaskRowProps) {
	const statusConfig = STATUS_CONFIG[task.status];
	const priorityConfig = PRIORITY_CONFIG[task.priority];
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState(0);
	const barRef = useRef<HTMLDivElement>(null);

	const totalWidth = cells.length * cellWidth;

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!position) return;
			setIsDragging(true);
			const startX = e.clientX;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const deltaX = moveEvent.clientX - startX;
				setDragOffset(deltaX);
			};

			const handleMouseUp = () => {
				setIsDragging(false);
				setDragOffset(0);
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[position],
	);

	return (
		<div className="group flex border-b hover:bg-muted/30">
			{/* Task Info */}
			<div className="sticky left-0 z-10 flex w-64 shrink-0 items-center gap-2 border-r bg-background p-2">
				<button
					type="button"
					onClick={onClick}
					className="flex-1 truncate text-left font-medium text-sm hover:underline"
				>
					{task.title}
				</button>
				<span className={cn("text-xs", priorityConfig.color)}>
					{priorityConfig.icon}
				</span>
			</div>

			{/* Timeline Area */}
			<div className="relative h-10" style={{ width: totalWidth }}>
				{/* Grid Lines */}
				{cells.map((cell, index) => {
					const isCurrentDay = isToday(cell);
					return (
						<div
							key={index}
							className={cn(
								"absolute top-0 h-full border-r",
								isCurrentDay && "bg-primary/5",
							)}
							style={{ left: index * cellWidth, width: cellWidth }}
						/>
					);
				})}

				{/* Today Marker */}
				{cells.some((cell) => isToday(cell)) && (
					<div
						className="absolute top-0 z-10 h-full w-0.5 bg-red-500"
						style={{
							left:
								cells.findIndex((cell) => isToday(cell)) * cellWidth +
								cellWidth / 2,
						}}
					/>
				)}

				{/* Task Bar */}
				{position && (
					<Tooltip>
						<TooltipTrigger>
							<div
								ref={barRef}
								className={cn(
									"absolute top-1 h-8 cursor-pointer rounded border-l-4 px-2 py-1 font-medium text-xs shadow-sm transition-shadow hover:shadow-md",
									statusConfig.bgColor,
									isDragging && "shadow-lg ring-2 ring-primary",
								)}
								style={{
									left: position.left + dragOffset + 2,
									width: position.width,
									borderLeftColor: statusConfig.color.replace("text-", ""),
								}}
								onClick={onClick}
								onMouseDown={handleMouseDown}
							>
								<span className="line-clamp-1">{task.title}</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<div className="space-y-1">
								<p className="font-medium">{task.title}</p>
								<p className={statusConfig.color}>{statusConfig.label}</p>
								{task.startDate && (
									<p className="text-xs">
										Start: {format(new Date(task.startDate), "MMM d, yyyy")}
									</p>
								)}
								{task.dueDate && (
									<p className="text-xs">
										Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
									</p>
								)}
							</div>
						</TooltipContent>
					</Tooltip>
				)}

				{/* Dependency Arrow Placeholder */}
				{task.dependencies && task.dependencies.length > 0 && position && (
					<div
						className="absolute top-4 text-muted-foreground"
						style={{ left: position.left - 12 }}
					>
						<ArrowRight className="h-3 w-3" />
					</div>
				)}
			</div>
		</div>
	);
}

// ============================================
// LOADING SKELETON
// ============================================

function TimelineSkeleton() {
	return (
		<div className="flex flex-col gap-2 p-4">
			<div className="flex items-center gap-2">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-24" />
			</div>
			<Skeleton className="h-10 w-full" />
			{[1, 2, 3, 4, 5].map((i) => (
				<Skeleton key={i} className="h-10 w-full" />
			))}
		</div>
	);
}

// ============================================
// TIMELINE VIEW COMPONENT
// ============================================

export function TimelineView({
	tasks,
	onTaskClick,
	onTaskUpdate: _onTaskUpdate,
	onTaskCreate,
	isLoading,
}: ViewProps) {
	const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const config = ZOOM_CONFIG[zoomLevel];
	const { start: timelineStart, end: timelineEnd } = useMemo(
		() => getTimelineRange(tasks, zoomLevel),
		[tasks, zoomLevel],
	);

	const cells = useMemo(
		() => getTimelineCells(timelineStart, timelineEnd, zoomLevel),
		[timelineStart, timelineEnd, zoomLevel],
	);

	// Filter tasks that have dates
	const tasksWithDates = useMemo(
		() => tasks.filter((t) => t.startDate || t.dueDate),
		[tasks],
	);

	const tasksWithoutDates = useMemo(
		() => tasks.filter((t) => !t.startDate && !t.dueDate),
		[tasks],
	);

	const scrollToToday = useCallback(() => {
		const todayIndex = cells.findIndex((cell) => {
			if (zoomLevel === "day") return isToday(cell);
			if (zoomLevel === "week")
				return isWithinInterval(new Date(), {
					start: cell,
					end: addDays(cell, 6),
				});
			return false;
		});

		if (todayIndex >= 0 && scrollContainerRef.current) {
			const scrollLeft = todayIndex * config.cellWidth - 300;
			scrollContainerRef.current.scrollLeft = Math.max(0, scrollLeft);
		}
	}, [cells, zoomLevel, config.cellWidth]);

	// Scroll to today on mount
	useEffect(() => {
		scrollToToday();
	}, [scrollToToday]);

	const handleZoomIn = useCallback(() => {
		if (zoomLevel === "month") setZoomLevel("week");
		else if (zoomLevel === "week") setZoomLevel("day");
	}, [zoomLevel]);

	const handleZoomOut = useCallback(() => {
		if (zoomLevel === "day") setZoomLevel("week");
		else if (zoomLevel === "week") setZoomLevel("month");
	}, [zoomLevel]);

	const handleScroll = useCallback((direction: "left" | "right") => {
		if (scrollContainerRef.current) {
			const scrollAmount = direction === "left" ? -300 : 300;
			scrollContainerRef.current.scrollBy({
				left: scrollAmount,
				behavior: "smooth",
			});
		}
	}, []);

	if (isLoading) {
		return <TimelineSkeleton />;
	}

	return (
		<div className="flex h-full flex-col">
			{/* Toolbar */}
			<div className="flex items-center gap-2 border-b p-3">
				{/* Zoom Controls */}
				<div className="flex items-center gap-1 rounded border">
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={handleZoomOut}
						disabled={zoomLevel === "month"}
					>
						<ZoomOut className="h-4 w-4" />
					</Button>
					<span className="w-12 text-center font-medium text-xs">
						{config.label}
					</span>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={handleZoomIn}
						disabled={zoomLevel === "day"}
					>
						<ZoomIn className="h-4 w-4" />
					</Button>
				</div>

				{/* Navigation */}
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-xs"
						onClick={() => handleScroll("left")}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onClick={scrollToToday}>
						<Calendar className="mr-1 h-4 w-4" />
						Today
					</Button>
					<Button
						variant="outline"
						size="icon-xs"
						onClick={() => handleScroll("right")}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex-1" />

				{/* Stats */}
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<span>{tasksWithDates.length} scheduled</span>
					{tasksWithoutDates.length > 0 && (
						<span className="text-amber-500">
							{tasksWithoutDates.length} unscheduled
						</span>
					)}
				</div>

				<Button size="sm" onClick={() => onTaskCreate()}>
					<Plus className="mr-1 h-4 w-4" />
					Add Task
				</Button>
			</div>

			{/* Timeline Content */}
			<div className="flex-1 overflow-auto" ref={scrollContainerRef}>
				<div className="min-w-max">
					{/* Header */}
					<TimelineHeader
						cells={cells}
						zoomLevel={zoomLevel}
						cellWidth={config.cellWidth}
					/>

					{/* Task Rows */}
					<div>
						{tasksWithDates.length > 0 ? (
							tasksWithDates.map((task) => (
								<TimelineTaskRow
									key={task.id}
									task={task}
									position={getTaskPosition(
										task,
										timelineStart,
										zoomLevel,
										config.cellWidth,
									)}
									cells={cells}
									cellWidth={config.cellWidth}
									onClick={() => onTaskClick(task.id)}
								/>
							))
						) : (
							<div className="flex h-48 items-center justify-center text-muted-foreground">
								<div className="text-center">
									<Calendar className="mx-auto mb-2 h-10 w-10" />
									<p className="text-sm">No tasks with dates</p>
									<p className="text-xs">
										Add start or due dates to see tasks on the timeline
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Unscheduled Tasks Section */}
					{tasksWithoutDates.length > 0 && (
						<div className="border-t bg-muted/30">
							<div className="sticky left-0 p-2">
								<span className="font-medium text-muted-foreground text-xs">
									Unscheduled ({tasksWithoutDates.length})
								</span>
							</div>
							<div className="flex flex-wrap gap-2 px-2 pb-2">
								{tasksWithoutDates.slice(0, 10).map((task) => {
									const statusConfig = STATUS_CONFIG[task.status];
									return (
										<button
											key={task.id}
											type="button"
											onClick={() => onTaskClick(task.id)}
											className={cn(
												"rounded border px-2 py-1 text-xs hover:bg-muted",
												statusConfig.bgColor,
											)}
										>
											{task.title}
										</button>
									);
								})}
								{tasksWithoutDates.length > 10 && (
									<span className="px-2 py-1 text-muted-foreground text-xs">
										+{tasksWithoutDates.length - 10} more
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
