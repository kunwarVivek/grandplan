import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import {
	BuildingIcon,
	CreditCardIcon,
	LayoutDashboardIcon,
	UsersIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
	beforeLoad: async ({ context }) => {
		const { session } = context;

		if (!session) {
			throw redirect({ to: "/login" });
		}

		// Check if user is a platform admin
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/platform/admin/check`,
				{
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw redirect({ to: "/dashboard" });
			}

			const data = await response.json();

			if (!data.isPlatformAdmin) {
				throw redirect({ to: "/dashboard" });
			}

			return { isPlatformAdmin: true, platformRole: data.role };
		} catch (error) {
			// If check fails, redirect to dashboard
			if (error instanceof Response || (error as { to?: string })?.to) {
				throw error;
			}
			throw redirect({ to: "/dashboard" });
		}
	},
	component: AdminLayout,
});

const adminNavItems = [
	{
		title: "Overview",
		href: "/admin",
		icon: LayoutDashboardIcon,
	},
	{
		title: "Users",
		href: "/admin/users",
		icon: UsersIcon,
	},
	{
		title: "Organizations",
		href: "/admin/organizations",
		icon: BuildingIcon,
	},
	{
		title: "Plans",
		href: "/admin/plans",
		icon: CreditCardIcon,
	},
];

function AdminLayout() {
	return (
		<div className="flex min-h-[calc(100svh-4rem)]">
			<aside className="w-56 shrink-0 border-r bg-muted/30">
				<div className="p-4">
					<h2 className="font-semibold text-sm">Admin Panel</h2>
				</div>
				<nav className="flex flex-col gap-1 px-2">
					{adminNavItems.map((item) => (
						<Link
							key={item.href}
							to={item.href}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
							activeOptions={{ exact: item.href === "/admin" }}
						>
							<item.icon className="size-4" />
							{item.title}
						</Link>
					))}
				</nav>
			</aside>
			<main className="flex-1 p-8">
				<Outlet />
			</main>
		</div>
	);
}
