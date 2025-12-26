import { createContext, useContext, useEffect, useMemo } from "react";

import { useActiveOrganization, useTheme, useUIStore, type Theme } from "@/stores";
import type { BrandingConfig } from "@/stores/organization-store";

type ThemeContextValue = {
	theme: Theme;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: Theme) => void;
	branding: BrandingConfig | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
};

export function ThemeProvider({
	children,
	defaultTheme = "dark",
}: ThemeProviderProps) {
	const theme = useTheme();
	const setTheme = useUIStore((state) => state.setTheme);
	const organization = useActiveOrganization();
	const branding = organization?.brandingConfig ?? null;

	// Resolve system theme
	const resolvedTheme = useMemo(() => {
		if (theme === "system") {
			if (typeof window !== "undefined") {
				return window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light";
			}
			return defaultTheme === "system" ? "dark" : defaultTheme;
		}
		return theme;
	}, [theme, defaultTheme]);

	// Apply theme class to document
	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(resolvedTheme);
	}, [resolvedTheme]);

	// Apply branding CSS variables
	useEffect(() => {
		if (!branding) return;

		const root = document.documentElement;

		// Apply color variables
		if (branding.primaryColor) {
			root.style.setProperty("--brand-primary", branding.primaryColor);
		}
		if (branding.secondaryColor) {
			root.style.setProperty("--brand-secondary", branding.secondaryColor);
		}
		if (branding.accentColor) {
			root.style.setProperty("--brand-accent", branding.accentColor);
		}
		if (branding.fontFamily) {
			root.style.setProperty("--brand-font-family", branding.fontFamily);
		}

		// Inject custom CSS
		if (branding.customCSS) {
			let styleElement = document.getElementById("brand-custom-css");
			if (!styleElement) {
				styleElement = document.createElement("style");
				styleElement.id = "brand-custom-css";
				document.head.appendChild(styleElement);
			}
			styleElement.textContent = branding.customCSS;
		}

		// Cleanup function
		return () => {
			root.style.removeProperty("--brand-primary");
			root.style.removeProperty("--brand-secondary");
			root.style.removeProperty("--brand-accent");
			root.style.removeProperty("--brand-font-family");

			const styleElement = document.getElementById("brand-custom-css");
			if (styleElement) {
				styleElement.remove();
			}
		};
	}, [branding]);

	// Listen for system theme changes
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const root = document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(mediaQuery.matches ? "dark" : "light");
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const value = useMemo(
		() => ({
			theme,
			resolvedTheme,
			setTheme,
			branding,
		}),
		[theme, resolvedTheme, setTheme, branding],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useThemeContext() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useThemeContext must be used within a ThemeProvider");
	}
	return context;
}
