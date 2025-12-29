"use client";

import { useNavigate } from "@tanstack/react-router";
import {
	FileText,
	FolderKanban,
	Layers,
	LayoutDashboard,
	Loader2,
	Plus,
	Search,
	Settings,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import {
	TASK_PRIORITY_CONFIG,
	TASK_STATUS_CONFIG,
} from "@/features/tasks/types";
import { useDebounce, useGlobalSearch } from "@/hooks";
import { useUIStore } from "@/stores";

export function CommandPalette() {
	const navigate = useNavigate();
	const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
	const toggleCommandPalette = useUIStore(
		(state) => state.toggleCommandPalette,
	);
	const openModal = useUIStore((state) => state.openModal);
	const [search, setSearch] = useState("");

	// Debounce search query to avoid excessive API calls
	const debouncedSearch = useDebounce(search, 300);
	const { data: searchResults, isLoading: isSearching } =
		useGlobalSearch(debouncedSearch);

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

	// Check if we have search results to display
	const hasSearchResults =
		searchResults &&
		(searchResults.tasks.length > 0 || searchResults.projects.length > 0);

	// Show search section when actively searching
	const showSearchSection = debouncedSearch.length >= 2;

	return (
		<CommandDialog
			open={commandPaletteOpen}
			onOpenChange={handleOpenChange}
			title="Command Palette"
			description="Search for commands and navigate the app"
		>
			<Command shouldFilter={!showSearchSection}>
				<div className="flex items-center border-b px-3">
					<Search className="mr-2 size-4 shrink-0 opacity-50" />
					<CommandInput
						placeholder="Type a command or search..."
						value={search}
						onValueChange={setSearch}
						className="border-0 focus:ring-0"
					/>
					{isSearching && (
						<Loader2 className="ml-2 size-4 shrink-0 animate-spin opacity-50" />
					)}
				</div>
				<CommandList>
					{/* Search Results Section */}
					{showSearchSection &&
						(isSearching ? (
							<div className="py-6 text-center text-muted-foreground text-sm">
								Searching...
							</div>
						) : hasSearchResults ? (
							<>
								{/* Task Results */}
								{searchResults.tasks.length > 0 && (
									<CommandGroup heading="Tasks">
										{searchResults.tasks.map((task) => (
											<CommandItem
												key={task.id}
												value={`task-${task.id}`}
												onSelect={() =>
													runCommand(() =>
														navigate({
															to: "/projects/$projectId",
															params: { projectId: task.projectId },
															search: { taskId: task.id },
														}),
													)
												}
											>
												<FileText className="mr-2 size-4 shrink-0" />
												<div className="flex flex-1 flex-col overflow-hidden">
													<span className="truncate font-medium">
														{task.title}
													</span>
													<span className="truncate text-muted-foreground text-xs">
														{task.projectName && (
															<span className="mr-2">{task.projectName}</span>
														)}
														<span
															className={TASK_STATUS_CONFIG[task.status]?.color}
														>
															{TASK_STATUS_CONFIG[task.status]?.label}
														</span>
														{" - "}
														<span
															className={
																TASK_PRIORITY_CONFIG[task.priority]?.color
															}
														>
															{TASK_PRIORITY_CONFIG[task.priority]?.label}
														</span>
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								)}

								{/* Project Results */}
								{searchResults.projects.length > 0 && (
									<CommandGroup heading="Projects">
										{searchResults.projects.map((project) => (
											<CommandItem
												key={project.id}
												value={`project-${project.id}`}
												onSelect={() =>
													runCommand(() =>
														navigate({
															to: "/projects/$projectId",
															params: { projectId: project.id },
														}),
													)
												}
											>
												<FolderKanban className="mr-2 size-4 shrink-0" />
												<div className="flex flex-1 flex-col overflow-hidden">
													<span className="truncate font-medium">
														{project.name}
													</span>
													<span className="truncate text-muted-foreground text-xs">
														/{project.slug}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								)}
								<CommandSeparator />
							</>
						) : (
							<div className="py-6 text-center text-muted-foreground text-sm">
								No results found for "{debouncedSearch}"
							</div>
						))}

					{/* Empty state when no search and no matching commands */}
					{!showSearchSection && <CommandEmpty>No results found.</CommandEmpty>}

					{/* Actions Section */}
					<CommandGroup heading="Actions">
						<CommandItem
							onSelect={() => runCommand(() => openModal("create-task"))}
						>
							<Plus className="size-4" />
							<span>Create Task</span>
							<CommandShortcut>T</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => openModal("create-project"))}
						>
							<FolderKanban className="size-4" />
							<span>Create Project</span>
							<CommandShortcut>P</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => openModal("create-workspace"))}
						>
							<Layers className="size-4" />
							<span>Create Workspace</span>
							<CommandShortcut>W</CommandShortcut>
						</CommandItem>
					</CommandGroup>

					{/* Navigation Section */}
					<CommandGroup heading="Navigation">
						<CommandItem
							onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}
						>
							<LayoutDashboard className="size-4" />
							<span>Dashboard</span>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => navigate({ to: "/projects" }))}
						>
							<FolderKanban className="size-4" />
							<span>Projects</span>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => navigate({ to: "/workspaces" }))}
						>
							<Layers className="size-4" />
							<span>Workspaces</span>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => navigate({ to: "/teams" }))}
						>
							<Users className="size-4" />
							<span>Teams</span>
						</CommandItem>
						<CommandItem
							onSelect={() => runCommand(() => navigate({ to: "/settings" }))}
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
