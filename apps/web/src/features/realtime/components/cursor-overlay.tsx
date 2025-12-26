// ============================================
// CURSOR OVERLAY COMPONENT
// ============================================

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { CursorData } from "../types";

type CursorOverlayProps = {
	cursors: CursorData[];
	excludeUserId?: string;
	containerRef?: React.RefObject<HTMLElement>;
	fadeTimeout?: number;
	className?: string;
};

type CursorProps = {
	cursor: CursorData;
	isStale: boolean;
};

// SVG cursor path
const CursorSvg = ({ color }: { color: string }) => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className="drop-shadow-md"
	>
		<path
			d="M5.5 3.5L20.5 11.5L13 13L10 20.5L5.5 3.5Z"
			fill={color}
			stroke="white"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
	</svg>
);

function Cursor({ cursor, isStale }: CursorProps) {
	return (
		<div
			className={cn(
				"pointer-events-none fixed z-[9999] transition-all duration-100 ease-out",
				isStale && "opacity-30"
			)}
			style={{
				left: cursor.x,
				top: cursor.y,
				transform: "translate(-2px, -2px)",
			}}
		>
			<CursorSvg color={cursor.color} />
			<div
				className={cn(
					"absolute left-5 top-4 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm",
					"transition-opacity duration-200",
					isStale && "opacity-0"
				)}
				style={{ backgroundColor: cursor.color }}
			>
				{cursor.name}
			</div>
		</div>
	);
}

export function CursorOverlay({
	cursors,
	excludeUserId,
	containerRef,
	fadeTimeout = 5000,
	className,
}: CursorOverlayProps) {
	const [staleCursors, setStaleCursors] = useState<Set<string>>(new Set());
	const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

	// Filter out the current user's cursor
	const visibleCursors = useMemo(() => {
		return cursors.filter((c) => c.userId !== excludeUserId);
	}, [cursors, excludeUserId]);

	// Calculate container offset for relative positioning
	useEffect(() => {
		if (!containerRef?.current) {
			setContainerOffset({ x: 0, y: 0 });
			return;
		}

		const updateOffset = () => {
			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				setContainerOffset({ x: rect.left, y: rect.top });
			}
		};

		updateOffset();
		window.addEventListener("resize", updateOffset);
		window.addEventListener("scroll", updateOffset);

		return () => {
			window.removeEventListener("resize", updateOffset);
			window.removeEventListener("scroll", updateOffset);
		};
	}, [containerRef]);

	// Track stale cursors (inactive for fadeTimeout ms)
	useEffect(() => {
		const checkStale = () => {
			const now = Date.now();
			const newStaleCursors = new Set<string>();

			for (const cursor of visibleCursors) {
				if (now - cursor.lastUpdate > fadeTimeout) {
					newStaleCursors.add(cursor.userId);
				}
			}

			setStaleCursors(newStaleCursors);
		};

		const interval = setInterval(checkStale, 1000);
		return () => clearInterval(interval);
	}, [visibleCursors, fadeTimeout]);

	// Adjust cursor positions relative to container
	const adjustedCursors = useMemo(() => {
		return visibleCursors.map((cursor) => ({
			...cursor,
			x: cursor.x - containerOffset.x,
			y: cursor.y - containerOffset.y,
		}));
	}, [visibleCursors, containerOffset]);

	if (visibleCursors.length === 0) {
		return null;
	}

	return (
		<div
			className={cn("pointer-events-none fixed inset-0 z-[9999]", className)}
			aria-hidden="true"
		>
			{adjustedCursors.map((cursor) => (
				<Cursor
					key={cursor.userId}
					cursor={cursor}
					isStale={staleCursors.has(cursor.userId)}
				/>
			))}
		</div>
	);
}

// Cursor indicator for a specific element (e.g., input field)
export function ElementCursor({
	userName,
	userColor,
	position = "top-right",
	className,
}: {
	userName: string;
	userColor: string;
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
	className?: string;
}) {
	const positionClasses = {
		"top-left": "-top-2 -left-2",
		"top-right": "-top-2 -right-2",
		"bottom-left": "-bottom-2 -left-2",
		"bottom-right": "-bottom-2 -right-2",
	};

	return (
		<div
			className={cn(
				"absolute z-50 pointer-events-none",
				positionClasses[position],
				className
			)}
		>
			<div
				className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm animate-in fade-in-0 zoom-in-95 duration-200"
				style={{ backgroundColor: userColor }}
			>
				<span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
				{userName}
			</div>
		</div>
	);
}

// Selection highlight for collaborative text editing
export function SelectionHighlight({
	color,
	userName,
}: {
	color: string;
	userName: string;
}) {
	// This component would need to be integrated with a text editor
	// to render selection highlights at the correct positions
	// The start/end positions would be passed via CSS transforms or positioning
	return (
		<div
			className="absolute pointer-events-none"
			style={{
				backgroundColor: `${color}30`, // 30 = ~18% opacity
				borderBottom: `2px solid ${color}`,
			}}
		>
			<span
				className="absolute -top-5 left-0 rounded px-1 py-0.5 text-xs text-white"
				style={{ backgroundColor: color }}
			>
				{userName}
			</span>
		</div>
	);
}

// Field editing indicator
export function FieldEditingIndicator({
	editorName,
	editorColor,
	className,
}: {
	editorName: string;
	editorColor: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"absolute inset-0 pointer-events-none rounded-md ring-2 animate-pulse",
				className
			)}
			style={{ "--tw-ring-color": editorColor } as React.CSSProperties}
		>
			<div
				className="absolute -top-6 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm"
				style={{ backgroundColor: editorColor }}
			>
				<span className="h-1.5 w-1.5 rounded-full bg-white/80" />
				{editorName} is editing
			</div>
		</div>
	);
}
