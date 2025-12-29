"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	FolderKanban,
	LayoutDashboard,
	Plus,
	Settings,
	Users,
	Building2,
	Layers,
} from "lucide-react";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/components/ui/command";
import { useUIStore } from "@/stores";

export function CommandPalette() {
	const navigate = useNavigate();
	const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
	const toggleCommandPalette = useUIStore(
		(state) => state.toggleCommandPalette,
	);
	const openModal = useUIStore((state) => state.openModal);
	const [search, setSearch] = useState("");

	// Keyboard shortcut handler
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggleCommandPalette();
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [toggleCommandPalette]);

	const runCommand = (command: () => void) => {
		toggleCommandPalette();
		setSearch("");
		command();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			toggleCommandPalette();
			setSearch("");
		}
	};

	return (
		<CommandDialog
			open={commandPaletteOpen}
			onOpenChange={handleOpenChange}
			title="Command Palette"
			description="Search for commands and navigate the app"
		>
			<Command>
				<CommandInput
					placeholder="Type a command or search..."
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Actions">
						<CommandItem
							onSelect={() =>
								runCommand(() => openModal("create-task"))
							}
						>
							<Plus className="size-4" />
							<span>Create Task</span>
							<CommandShortcut>T</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() => openModal("create-project"))
							}
						>
							<FolderKanban className="size-4" />
							<span>Create Project</span>
							<CommandShortcut>P</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() => openModal("create-workspace"))
							}
						>
							<Layers className="size-4" />
							<span>Create Workspace</span>
							<CommandShortcut>W</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandGroup heading="Navigation">
						<CommandItem
							onSelect={() =>
								runCommand(() =>
									navigate({ to: "/dashboard" })
								)
							}
						>
							<LayoutDashboard className="size-4" />
							<span>Dashboard</span>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() => navigate({ to: "/projects" }))
							}
						>
							<FolderKanban className="size-4" />
							<span>Projects</span>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() =>
									navigate({ to: "/workspaces" })
								)
							}
						>
							<Layers className="size-4" />
							<span>Workspaces</span>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() => navigate({ to: "/teams" }))
							}
						>
							<Users className="size-4" />
							<span>Teams</span>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								runCommand(() => navigate({ to: "/settings" }))
							}
						>
							<Settings className="size-4" />
							<span>Settings</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
