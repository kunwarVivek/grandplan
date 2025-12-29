"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export type PageHeaderProps = {
	/** Page title */
	title: string;
	/** Page description */
	description?: string;
	/** Breadcrumb items */
	breadcrumbs?: BreadcrumbItem[];
	/** Actions slot (buttons, etc.) */
	actions?: React.ReactNode;
	/** Additional class names */
	className?: string;
	/** Children for additional content below the header */
	children?: React.ReactNode;
};

export function PageHeader({
	title,
	description,
	breadcrumbs,
	actions,
	className,
	children,
}: PageHeaderProps) {
	return (
		<div className={cn("space-y-4", className)}>
			{breadcrumbs && breadcrumbs.length > 0 && (
				<Breadcrumb items={breadcrumbs} />
			)}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>
				{actions && (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				)}
			</div>
			{children}
		</div>
	);
}
