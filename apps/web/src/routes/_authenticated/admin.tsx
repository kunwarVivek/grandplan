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

		// TODO: Implement actual platform admin check
		// For now, just check if user is authenticated
		// In production, this should verify against a platform admin role/list
		if (!session) {
			throw redirect({
				to: "/dashboard",
			});
		}

		return { isPlatformAdmin: true };
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
