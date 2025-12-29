"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarItemProps = {
	/** Icon to display */
	icon?: React.ReactNode;
	/** Label text */
	label: string;
	/** Navigation href */
	href?: string;
	/** Whether the item is active */
	active?: boolean;
	/** Optional badge/count to display */
	badge?: number | string;
	/** Nested items for collapsible sections */
	children?: React.ReactNode;
	/** Whether the sidebar is collapsed */
	collapsed?: boolean;
	/** Click handler for non-link items */
	onClick?: () => void;
	/** Additional class names */
	className?: string;
	/** Whether the nested section is initially expanded */
	defaultExpanded?: boolean;
};

export function SidebarItem({
	icon,
	label,
	href,
	active: activeProp,
	badge,
	children,
	collapsed = false,
	onClick,
	className,
	defaultExpanded = false,
}: SidebarItemProps) {
	const location = useLocation();
	const [expanded, setExpanded] = React.useState(defaultExpanded);
	const hasChildren = React.Children.count(children) > 0;

	// Auto-detect active state from route if href is provided
	const isActive = activeProp ?? (href ? location.pathname === href : false);

	const content = (
		<>
			{icon && (
				<span className="flex size-5 shrink-0 items-center justify-center">
					{icon}
				</span>
			)}
			{!collapsed && (
				<>
					<span className="flex-1 truncate text-left">{label}</span>
					{badge !== undefined && (
						<span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 font-medium text-[10px] text-primary">
							{badge}
						</span>
					)}
					{hasChildren && (
						<ChevronRight
							className={cn(
								"ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200",
								expanded && "rotate-90",
							)}
						/>
					)}
				</>
			)}
		</>
	);

	const itemClasses = cn(
		"group flex w-full items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
		"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
		isActive && "bg-accent text-accent-foreground",
		collapsed && "justify-center px-2",
		className,
	);

	// If it has children, render as a collapsible button
	if (hasChildren) {
		return (
			<div className="space-y-1">
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className={itemClasses}
					title={collapsed ? label : undefined}
				>
					{content}
				</button>
				{expanded && !collapsed && (
					<div className="ml-4 space-y-1 border-border border-l pl-3">
						{children}
					</div>
				)}
			</div>
		);
	}

	// If it has an href, render as a Link
	if (href) {
		return (
			<Link
				to={href}
				className={itemClasses}
				title={collapsed ? label : undefined}
			>
				{content}
			</Link>
		);
	}

	// Otherwise render as a button
	return (
		<Button
			variant="ghost"
			onClick={onClick}
			className={cn(itemClasses, "h-auto justify-start")}
			title={collapsed ? label : undefined}
		>
			{content}
		</Button>
	);
}

export type SidebarSectionProps = {
	/** Section title */
	title?: string;
	/** Section items */
	children: React.ReactNode;
	/** Whether the sidebar is collapsed */
	collapsed?: boolean;
	/** Additional class names */
	className?: string;
};

export function SidebarSection({
	title,
	children,
	collapsed = false,
	className,
}: SidebarSectionProps) {
	return (
		<div className={cn("space-y-1", className)}>
			{title && !collapsed && (
				<h4 className="mb-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
					{title}
				</h4>
			)}
			{collapsed && title && (
				<div className="mx-auto my-2 h-px w-8 bg-border" />
			)}
			<nav className="space-y-1">{children}</nav>
		</div>
	);
}
