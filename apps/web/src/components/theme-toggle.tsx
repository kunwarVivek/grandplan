"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Theme, useTheme, useUIStore } from "@/stores";

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

type ThemeToggleProps = {
	className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
	const theme = useTheme();
	const setTheme = useUIStore((state) => state.setTheme);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={className}
						aria-label="Toggle theme"
					/>
				}
			>
				<Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={8}>
				{themeOptions.map(({ value, label, icon: Icon }) => (
					<DropdownMenuItem
						key={value}
						onSelect={() => setTheme(value)}
						className={theme === value ? "bg-accent" : undefined}
					>
						<Icon className="mr-2 size-4" />
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
