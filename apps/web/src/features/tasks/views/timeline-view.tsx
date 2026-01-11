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
	Calendar,
	ChevronLeft,
	ChevronRight,
	GitBranch,
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
import type { DependencyType } from "../hooks/use-tasks";

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
// DEPENDENCY TYPES & ARROW CONFIG
// ============================================

type DependencyLink = {
	id: string;
	fromTaskId: string;
	toTaskId: string;
	type: DependencyType;
};

type ArrowPosition = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	type: DependencyType;
	id: string;
	fromTaskId: string;
	toTaskId: string;
};

const DEPENDENCY_ARROW_CONFIG: Record<
	DependencyType,
	{ color: string; strokeDasharray?: string; label: string }
> = {
	BLOCKS: {
		color: "#ef4444", // red-500
		label: "Blocks",
	},
	REQUIRED_BY: {
		color: "#f59e0b", // amber-500
		label: "Required by",
	},
	RELATED_TO: {
		color: "#6b7280", // gray-500
		strokeDasharray: "4 2",
		label: "Related to",
	},
};

// Row height constant for arrow calculations
const TASK_ROW_HEIGHT = 40;
const TASK_LIST_WIDTH = 256; // w-64 = 16rem = 256px

// ============================================
// DEPENDENCY ARROW COMPONENT
// ============================================

interface DependencyArrowProps {
	arrow: ArrowPosition;
	isHovered: boolean;
	onHover: (id: string | null) => void;
}

function DependencyArrow({ arrow, isHovered, onHover }: DependencyArrowProps) {
	const config = DEPENDENCY_ARROW_CONFIG[arrow.type];

	// Calculate control points for a smooth bezier curve
	const dx = arrow.endX - arrow.startX;
	const dy = arrow.endY - arrow.startY;

	// Determine path based on relative positions
	let path: string;

	if (dx > 50) {
		// Normal case: end is to the right of start
		const controlOffset = Math.min(Math.abs(dx) * 0.4, 100);
		path = `
			M ${arrow.startX} ${arrow.startY}
			C ${arrow.startX + controlOffset} ${arrow.startY},
			  ${arrow.endX - controlOffset} ${arrow.endY},
			  ${arrow.endX} ${arrow.endY}
		`;
	} else if (dx < -50) {
		// Reverse case: end is to the left of start (task goes backwards)
		// Create an arc that goes around
		const arcHeight = Math.max(30, Math.abs(dy) * 0.5);
		const midY = arrow.startY < arrow.endY
			? Math.min(arrow.startY, arrow.endY) - arcHeight
			: Math.max(arrow.startY, arrow.endY) + arcHeight;

		path = `
			M ${arrow.startX} ${arrow.startY}
			Q ${arrow.startX + 30} ${midY},
			  ${(arrow.startX + arrow.endX) / 2} ${midY}
			Q ${arrow.endX - 30} ${midY},
			  ${arrow.endX} ${arrow.endY}
		`;
	} else {
		// Close horizontal distance: create a slight S-curve
		const verticalOffset = dy > 0 ? 20 : -20;
		path = `
			M ${arrow.startX} ${arrow.startY}
			C ${arrow.startX + 40} ${arrow.startY + verticalOffset},
			  ${arrow.endX - 40} ${arrow.endY - verticalOffset},
			  ${arrow.endX} ${arrow.endY}
		`;
	}

	// Arrow head size
	const headSize = 6;

	// Calculate arrow head angle at the end point
	// Using the tangent direction at the curve end
	const tangentDx = dx > 50 ? 1 : dx < -50 ? 1 : 1;
	const tangentDy = dy / (Math.abs(dx) + 1) * 0.3;
	const angle = Math.atan2(tangentDy, tangentDx);

	const headPoints = [
		{ x: arrow.endX, y: arrow.endY },
		{
			x: arrow.endX - headSize * Math.cos(angle - Math.PI / 6),
			y: arrow.endY - headSize * Math.sin(angle - Math.PI / 6),
		},
		{
			x: arrow.endX - headSize * Math.cos(angle + Math.PI / 6),
			y: arrow.endY - headSize * Math.sin(angle + Math.PI / 6),
		},
	];

	return (
		<g
			onMouseEnter={() => onHover(arrow.id)}
			onMouseLeave={() => onHover(null)}
			className="cursor-pointer"
		>
			{/* Wider invisible path for easier hovering */}
			<path
				d={path}
				fill="none"
				stroke="transparent"
				strokeWidth={12}
			/>
			{/* Visible path */}
			<path
				d={path}
				fill="none"
				stroke={config.color}
				strokeWidth={isHovered ? 2.5 : 1.5}
				strokeDasharray={config.strokeDasharray}
				opacity={isHovered ? 1 : 0.7}
				className="transition-all duration-150"
			/>
			{/* Arrow head */}
			<polygon
				points={headPoints.map((p) => `${p.x},${p.y}`).join(" ")}
				fill={config.color}
				opacity={isHovered ? 1 : 0.7}
				className="transition-all duration-150"
			/>
			{/* Hover tooltip indicator */}
			{isHovered && (
				<text
					x={(arrow.startX + arrow.endX) / 2}
					y={(arrow.startY + arrow.endY) / 2 - 8}
					fontSize="10"
					fill={config.color}
					textAnchor="middle"
					className="pointer-events-none font-medium"
				>
					{config.label}
				</text>
			)}
		</g>
	);
}

// ============================================
// DEPENDENCY ARROWS OVERLAY
// ============================================

interface DependencyArrowsOverlayProps {
	arrows: ArrowPosition[];
	width: number;
	height: number;
	scrollLeft: number;
	scrollTop: number;
}

function DependencyArrowsOverlay({
	arrows,
	width,
	height,
}: DependencyArrowsOverlayProps) {
	const [hoveredArrowId, setHoveredArrowId] = useState<string | null>(null);

	if (arrows.length === 0) return null;

	// Group arrows by vertical overlap to handle overlapping
	const processedArrows = useMemo(() => {
		// Sort arrows to render hovered one on top
		return [...arrows].sort((a, b) => {
			if (a.id === hoveredArrowId) return 1;
			if (b.id === hoveredArrowId) return -1;
			return 0;
		});
	}, [arrows, hoveredArrowId]);

	return (
		<svg
			className="pointer-events-none absolute top-0 left-0 overflow-visible"
			style={{
				width,
				height,
				marginLeft: TASK_LIST_WIDTH,
			}}
		>
			<defs>
				{/* Gradient definitions for arrows */}
				<linearGradient id="arrow-gradient-blocks" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
				</linearGradient>
				<linearGradient id="arrow-gradient-required" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
				</linearGradient>
				<linearGradient id="arrow-gradient-related" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#6b7280" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#6b7280" stopOpacity="1" />
				</linearGradient>
			</defs>
			<g className="pointer-events-auto">
				{processedArrows.map((arrow) => (
					<DependencyArrow
						key={arrow.id}
						arrow={arrow}
						isHovered={hoveredArrowId === arrow.id}
						onHover={setHoveredArrowId}
					/>
				))}
			</g>
		</svg>
	);
}

// ============================================
// CALCULATE ARROW POSITIONS
// ============================================

function calculateArrowPositions(
	_tasks: Task[],
	dependencies: DependencyLink[],
	taskPositions: Map<string, { left: number; width: number }>,
	taskRowIndices: Map<string, number>,
): ArrowPosition[] {
	const arrows: ArrowPosition[] = [];

	for (const dep of dependencies) {
		const fromPosition = taskPositions.get(dep.fromTaskId);
		const toPosition = taskPositions.get(dep.toTaskId);
		const fromRowIndex = taskRowIndices.get(dep.fromTaskId);
		const toRowIndex = taskRowIndices.get(dep.toTaskId);

		// Skip if either task doesn't have a visible position
		if (
			!fromPosition ||
			!toPosition ||
			fromRowIndex === undefined ||
			toRowIndex === undefined
		) {
			continue;
		}

		// Calculate start point (right edge of "from" task bar)
		const startX = fromPosition.left + fromPosition.width + 2;
		const startY = fromRowIndex * TASK_ROW_HEIGHT + TASK_ROW_HEIGHT / 2;

		// Calculate end point (left edge of "to" task bar)
		const endX = toPosition.left;
		const endY = toRowIndex * TASK_ROW_HEIGHT + TASK_ROW_HEIGHT / 2;

		arrows.push({
			id: dep.id,
			startX,
			startY,
			endX,
			endY,
			type: dep.type,
			fromTaskId: dep.fromTaskId,
			toTaskId: dep.toTaskId,
		});
	}

	return arrows;
}

// ============================================
// EXTRACT DEPENDENCIES FROM TASKS
// ============================================

function extractDependencies(tasks: Task[]): DependencyLink[] {
	const dependencies: DependencyLink[] = [];
	const taskIds = new Set(tasks.map((t) => t.id));

	for (const task of tasks) {
		if (task.dependencies && task.dependencies.length > 0) {
			for (const depId of task.dependencies) {
				// Only include dependencies where both tasks are visible
				if (taskIds.has(depId)) {
					dependencies.push({
						id: `${depId}-${task.id}`,
						fromTaskId: depId, // The blocking task
						toTaskId: task.id, // The blocked task
						type: "BLOCKS",
					});
				}
			}
		}
	}

	return dependencies;
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

				{/* Dependency indicator badge */}
				{task.dependencies && task.dependencies.length > 0 && position && (
					<div
						className="absolute top-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold"
						style={{
							left: position.left - 6,
							width: 12,
							height: 12,
						}}
						title={`Has ${task.dependencies.length} dependencies`}
					>
						{task.dependencies.length}
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
	const [showDependencies, setShowDependencies] = useState(true);
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

	// Calculate task positions for dependency arrows
	const taskPositions = useMemo(() => {
		const positions = new Map<string, { left: number; width: number }>();
		for (const task of tasksWithDates) {
			const position = getTaskPosition(
				task,
				timelineStart,
				zoomLevel,
				config.cellWidth,
			);
			if (position) {
				positions.set(task.id, position);
			}
		}
		return positions;
	}, [tasksWithDates, timelineStart, zoomLevel, config.cellWidth]);

	// Calculate row indices for dependency arrows
	const taskRowIndices = useMemo(() => {
		const indices = new Map<string, number>();
		tasksWithDates.forEach((task, index) => {
			indices.set(task.id, index);
		});
		return indices;
	}, [tasksWithDates]);

	// Extract dependencies from tasks
	const dependencies = useMemo(
		() => extractDependencies(tasksWithDates),
		[tasksWithDates],
	);

	// Calculate arrow positions
	const arrows = useMemo(
		() =>
			calculateArrowPositions(
				tasksWithDates,
				dependencies,
				taskPositions,
				taskRowIndices,
			),
		[tasksWithDates, dependencies, taskPositions, taskRowIndices],
	);

	// Timeline dimensions for SVG overlay
	const timelineWidth = cells.length * config.cellWidth;
	const timelineHeight = tasksWithDates.length * TASK_ROW_HEIGHT;

	// Track scroll position for arrow rendering
	const [scrollState, setScrollState] = useState({ left: 0, top: 0 });

	// Update scroll state when scrolling
	const handleScrollUpdate = useCallback(() => {
		if (scrollContainerRef.current) {
			setScrollState({
				left: scrollContainerRef.current.scrollLeft,
				top: scrollContainerRef.current.scrollTop,
			});
		}
	}, []);

	// Add scroll event listener
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container) {
			container.addEventListener("scroll", handleScrollUpdate);
			return () => container.removeEventListener("scroll", handleScrollUpdate);
		}
	}, [handleScrollUpdate]);

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

				{/* Dependencies Toggle */}
				{dependencies.length > 0 && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant={showDependencies ? "secondary" : "outline"}
									size="sm"
									onClick={() => setShowDependencies(!showDependencies)}
									className="gap-1"
								>
									<GitBranch className="h-4 w-4" />
									<span className="hidden sm:inline">Dependencies</span>
									<span className="rounded-full bg-muted px-1.5 text-xs">
										{dependencies.length}
									</span>
								</Button>
							}
						/>
						<TooltipContent>
							<div className="space-y-1">
								<p className="font-medium">
									{showDependencies ? "Hide" : "Show"} dependency arrows
								</p>
								<div className="flex flex-col gap-1 text-xs">
									<div className="flex items-center gap-2">
										<span
											className="h-0.5 w-4 rounded"
											style={{ backgroundColor: "#ef4444" }}
										/>
										<span>Blocks</span>
									</div>
									<div className="flex items-center gap-2">
										<span
											className="h-0.5 w-4 rounded"
											style={{ backgroundColor: "#f59e0b" }}
										/>
										<span>Required by</span>
									</div>
									<div className="flex items-center gap-2">
										<span
											className="h-0.5 w-4 rounded border-dashed"
											style={{
												backgroundColor: "#6b7280",
												borderStyle: "dashed",
											}}
										/>
										<span>Related to</span>
									</div>
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				)}

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

					{/* Task Rows with Dependency Arrows */}
					<div className="relative">
						{tasksWithDates.length > 0 ? (
							<>
								{/* Task Rows */}
								{tasksWithDates.map((task) => (
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
								))}

								{/* Dependency Arrows Overlay */}
								{showDependencies && arrows.length > 0 && (
									<DependencyArrowsOverlay
										arrows={arrows}
										width={timelineWidth}
										height={timelineHeight}
										scrollLeft={scrollState.left}
										scrollTop={scrollState.top}
									/>
								)}
							</>
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
