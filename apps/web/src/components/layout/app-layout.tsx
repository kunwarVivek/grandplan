"use client";

import { X } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTaskDetailState, useUIStore } from "@/stores";

import { MobileSidebarTrigger, Sidebar } from "./sidebar";

export type AppLayoutProps = {
	/** Main content */
	children: React.ReactNode;
	/** Task detail panel content (optional) */
	taskDetailPanel?: React.ReactNode;
	/** Additional class names for the main content area */
	className?: string;
	/** Whether to show the header bar */
	showHeader?: boolean;
	/** Header content (left side) */
	headerLeft?: React.ReactNode;
	/** Header content (right side) */
	headerRight?: React.ReactNode;
};

function TaskDetailPanel({
	children,
	onClose,
}: {
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<aside className="flex h-full w-full max-w-md flex-col border-border border-l bg-card lg:max-w-lg xl:max-w-xl">
			<div className="flex items-center justify-between border-border border-b px-4 py-3">
				<h2 className="font-semibold text-sm">Task Details</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					aria-label="Close task detail panel"
				>
					<X className="size-4" />
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto">{children}</div>
		</aside>
	);
}

export function AppLayout({
	children,
	taskDetailPanel,
	className,
	showHeader = true,
	headerLeft,
	headerRight,
}: AppLayoutProps) {
	const { isOpen: taskDetailOpen, taskId } = useTaskDetailState();
	const closeTaskDetail = useUIStore((state) => state.closeTaskDetail);

	// Show task detail panel if it's open and we have content for it
	const showTaskDetail = taskDetailOpen && taskId && taskDetailPanel;

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background">
			{/* Sidebar */}
			<Sidebar />

			{/* Main Content Area */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Top Header Bar (for mobile nav trigger and other controls) */}
				{showHeader && (
					<header className="flex h-14 shrink-0 items-center gap-4 border-border border-b bg-card px-4 lg:px-6">
						<MobileSidebarTrigger />
						{headerLeft && (
							<div className="flex flex-1 items-center gap-4">{headerLeft}</div>
						)}
						{headerRight && (
							<div className="ml-auto flex items-center gap-2">
								{headerRight}
							</div>
						)}
					</header>
				)}

				{/* Content + Task Detail Grid */}
				<div className="flex flex-1 overflow-hidden">
					{/* Main Content */}
					<main
						className={cn(
							"flex-1 overflow-y-auto",
							showTaskDetail && "hidden lg:block",
							className,
						)}
					>
						{children}
					</main>

					{/* Task Detail Panel */}
					{showTaskDetail && (
						<TaskDetailPanel onClose={closeTaskDetail}>
							{taskDetailPanel}
						</TaskDetailPanel>
					)}
				</div>
			</div>
		</div>
	);
}

export type ContentContainerProps = {
	/** Content to render */
	children: React.ReactNode;
	/** Max width variant */
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
	/** Additional class names */
	className?: string;
	/** Padding variant */
	padding?: "none" | "sm" | "md" | "lg";
};

const maxWidthClasses = {
	sm: "max-w-screen-sm",
	md: "max-w-screen-md",
	lg: "max-w-screen-lg",
	xl: "max-w-screen-xl",
	"2xl": "max-w-screen-2xl",
	full: "max-w-full",
};

const paddingClasses = {
	none: "",
	sm: "p-4",
	md: "p-6",
	lg: "p-8",
};

export function ContentContainer({
	children,
	maxWidth = "2xl",
	className,
	padding = "md",
}: ContentContainerProps) {
	return (
		<div
			className={cn(
				"mx-auto w-full",
				maxWidthClasses[maxWidth],
				paddingClasses[padding],
				className,
			)}
		>
			{children}
		</div>
	);
}
