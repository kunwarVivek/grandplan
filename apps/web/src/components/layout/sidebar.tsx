"use client";

import {
	Building2,
	CheckSquare,
	ChevronLeft,
	FolderKanban,
	Menu,
	Settings,
	Users,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	useActiveOrganization,
	useActiveWorkspace,
	useOrganizationStore,
	useOrganizations,
	useSidebarCollapsed,
	useUIStore,
	useWorkspaceStore,
	useWorkspaces,
} from "@/stores";
import type { Organization, Workspace } from "@/stores";
import { useLocation } from "@tanstack/react-router";

import { SidebarItem, SidebarSection } from "./sidebar-item";

export type SidebarProps = {
	/** Additional class names */
	className?: string;
	/** Whether to render as a mobile sheet */
	isMobile?: boolean;
	/** Callback when mobile sheet should close */
	onMobileClose?: () => void;
};

function OrganizationSelector({ collapsed }: { collapsed: boolean }) {
	const activeOrganization = useActiveOrganization();
	const activeWorkspace = useActiveWorkspace();
	const organizations = useOrganizations();
	const workspaces = useWorkspaces();
	const setActiveOrganization = useOrganizationStore(
		(state) => state.setActiveOrganization
	);
	const setActiveWorkspace = useWorkspaceStore(
		(state) => state.setActiveWorkspace
	);

	const handleOrgChange = (org: Organization) => {
		setActiveOrganization(org);
		// Clear workspace when org changes
		setActiveWorkspace(null);
	};

	const handleWorkspaceChange = (workspace: Workspace) => {
		setActiveWorkspace(workspace);
	};

	// Get org branding logo if available
	const orgLogo =
		activeOrganization?.brandingConfig?.logo || activeOrganization?.logo;

	return (
		<div className="space-y-2 border-b border-border p-3">
			{/* Organization Selector */}
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						"flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
						collapsed && "justify-center px-0"
					)}
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
						{orgLogo ? (
							<img
								src={orgLogo}
								alt={activeOrganization?.name || "Organization"}
								className="size-6 rounded object-cover"
							/>
						) : (
							<Building2 className="size-4 text-primary" />
						)}
					</div>
					{!collapsed && (
						<div className="flex-1 overflow-hidden">
							<p className="truncate text-sm font-medium">
								{activeOrganization?.name || "Select Organization"}
							</p>
							{activeWorkspace && (
								<p className="truncate text-xs text-muted-foreground">
									{activeWorkspace.name}
								</p>
							)}
						</div>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					side={collapsed ? "right" : "bottom"}
					className="w-64 bg-card"
				>
					<DropdownMenuLabel>Organizations</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{organizations.map((org) => (
						<DropdownMenuItem
							key={org.id}
							onClick={() => handleOrgChange(org)}
							className={cn(
								activeOrganization?.id === org.id && "bg-accent"
							)}
						>
							<Building2 className="mr-2 size-4" />
							{org.name}
						</DropdownMenuItem>
					))}
					{organizations.length === 0 && (
						<DropdownMenuItem disabled>No organizations</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuLabel>Workspaces</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{workspaces
						.filter((ws) => ws.organizationId === activeOrganization?.id)
						.map((workspace) => (
							<DropdownMenuItem
								key={workspace.id}
								onClick={() => handleWorkspaceChange(workspace)}
								className={cn(
									activeWorkspace?.id === workspace.id && "bg-accent"
								)}
							>
								<FolderKanban className="mr-2 size-4" />
								{workspace.name}
							</DropdownMenuItem>
						))}
					{workspaces.filter(
						(ws) => ws.organizationId === activeOrganization?.id
					).length === 0 && (
						<DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function UserSection({ collapsed }: { collapsed: boolean }) {
	const location = useLocation();
	const isSettingsActive = location.pathname.startsWith("/settings");

	return (
		<div className="border-t border-border p-3">
			<SidebarItem
				icon={<Settings className="size-5" />}
				label="Settings"
				href="/settings"
				active={isSettingsActive}
				collapsed={collapsed}
			/>
		</div>
	);
}

function SidebarContent({
	collapsed,
	onMobileClose,
}: {
	collapsed: boolean;
	onMobileClose?: () => void;
}) {
	const location = useLocation();

	const handleNavClick = () => {
		if (onMobileClose) {
			onMobileClose();
		}
	};

	return (
		<div className="flex h-full flex-col">
			<OrganizationSelector collapsed={collapsed} />

			<div className="flex-1 overflow-y-auto p-3">
				<SidebarSection title="Main" collapsed={collapsed}>
					<div onClick={handleNavClick}>
						<SidebarItem
							icon={<CheckSquare className="size-5" />}
							label="Tasks"
							href="/tasks"
							active={location.pathname.startsWith("/tasks")}
							collapsed={collapsed}
						/>
					</div>
					<div onClick={handleNavClick}>
						<SidebarItem
							icon={<FolderKanban className="size-5" />}
							label="Projects"
							href="/projects"
							active={location.pathname.startsWith("/projects")}
							collapsed={collapsed}
						/>
					</div>
					<div onClick={handleNavClick}>
						<SidebarItem
							icon={<Users className="size-5" />}
							label="Teams"
							href="/teams"
							active={location.pathname.startsWith("/teams")}
							collapsed={collapsed}
						/>
					</div>
				</SidebarSection>
			</div>

			<UserSection collapsed={collapsed} />
		</div>
	);
}

export function Sidebar({
	className,
	isMobile = false,
	onMobileClose,
}: SidebarProps) {
	const collapsed = useSidebarCollapsed();
	const toggleSidebar = useUIStore((state) => state.toggleSidebar);

	if (isMobile) {
		return (
			<div className="flex h-full w-64 flex-col bg-card">
				<SidebarContent collapsed={false} onMobileClose={onMobileClose} />
			</div>
		);
	}

	return (
		<aside
			className={cn(
				"relative hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 lg:flex",
				collapsed ? "w-16" : "w-64",
				className
			)}
		>
			<SidebarContent collapsed={collapsed} />

			{/* Collapse Toggle Button */}
			<button
				type="button"
				onClick={toggleSidebar}
				className="absolute -right-3 top-6 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-accent"
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				<ChevronLeft
					className={cn(
						"size-4 transition-transform",
						collapsed && "rotate-180"
					)}
				/>
			</button>
		</aside>
	);
}

export function MobileSidebarTrigger() {
	const [open, setOpen] = React.useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="lg:hidden"
				onClick={() => setOpen(true)}
				aria-label="Open navigation menu"
			>
				<Menu className="size-5" />
			</Button>

			{/* Mobile Sheet Overlay */}
			{open && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-40 bg-black/50 lg:hidden"
						onClick={() => setOpen(false)}
						aria-hidden="true"
					/>
					{/* Sheet */}
					<div className="fixed inset-y-0 left-0 z-50 w-64 animate-in slide-in-from-left lg:hidden">
						<Sidebar isMobile onMobileClose={() => setOpen(false)} />
					</div>
				</>
			)}
		</>
	);
}
