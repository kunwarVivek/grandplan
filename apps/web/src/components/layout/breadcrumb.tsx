"use client";

import { ChevronRight, Home } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export type BreadcrumbItem = {
	/** Display label */
	label: string;
	/** Navigation href (optional for current page) */
	href?: string;
	/** Icon to display (optional) */
	icon?: React.ReactNode;
};

export type BreadcrumbProps = {
	/** Array of breadcrumb items */
	items: BreadcrumbItem[];
	/** Whether to show home icon as first item */
	showHome?: boolean;
	/** Home href (defaults to /) */
	homeHref?: string;
	/** Additional class names */
	className?: string;
};

export function Breadcrumb({
	items,
	showHome = true,
	homeHref = "/dashboard",
	className,
}: BreadcrumbProps) {
	const allItems: BreadcrumbItem[] = showHome
		? [{ label: "Home", href: homeHref, icon: <Home className="size-4" /> }, ...items]
		: items;

	return (
		<nav
			aria-label="Breadcrumb"
			className={cn("flex items-center gap-1 text-sm", className)}
		>
			<ol className="flex items-center gap-1">
				{allItems.map((item, index) => {
					const isLast = index === allItems.length - 1;
					const isFirst = index === 0;

					return (
						<li key={item.label} className="flex items-center gap-1">
							{!isFirst && (
								<ChevronRight
									className="size-4 shrink-0 text-muted-foreground"
									aria-hidden="true"
								/>
							)}
							{isLast ? (
								<span
									className="font-medium text-foreground"
									aria-current="page"
								>
									{item.icon && !isFirst && (
										<span className="mr-1.5 inline-flex">{item.icon}</span>
									)}
									{isFirst && item.icon ? (
										<span className="sr-only">{item.label}</span>
									) : (
										item.label
									)}
									{isFirst && item.icon && item.icon}
								</span>
							) : item.href ? (
								<Link
									to={item.href}
									className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
								>
									{item.icon && (
										<span className={cn(!isFirst && "mr-1.5")}>
											{item.icon}
										</span>
									)}
									{isFirst && item.icon ? (
										<span className="sr-only">{item.label}</span>
									) : (
										item.label
									)}
								</Link>
							) : (
								<span className="flex items-center text-muted-foreground">
									{item.icon && (
										<span className={cn(!isFirst && "mr-1.5")}>
											{item.icon}
										</span>
									)}
									{isFirst && item.icon ? (
										<span className="sr-only">{item.label}</span>
									) : (
										item.label
									)}
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
