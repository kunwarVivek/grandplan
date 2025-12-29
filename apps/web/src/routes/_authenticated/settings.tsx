import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BellIcon, CreditCardIcon, ShieldIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsLayout,
});

const settingsNavItems = [
	{
		title: "Profile",
		href: "/settings/profile",
		icon: UserIcon,
	},
	{
		title: "Notifications",
		href: "/settings/notifications",
		icon: BellIcon,
	},
	{
		title: "Security",
		href: "/settings/security",
		icon: ShieldIcon,
	},
	{
		title: "Billing",
		href: "/settings/billing",
		icon: CreditCardIcon,
	},
];

function SettingsLayout() {
	return (
		<div className="container mx-auto flex flex-col gap-8 py-8 lg:flex-row">
			<aside className="w-full shrink-0 lg:w-56">
				<nav className="flex flex-col gap-1">
					{settingsNavItems.map((item) => (
						<Link
							key={item.href}
							to={item.href}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
						>
							<item.icon className="size-4" />
							{item.title}
						</Link>
					))}
				</nav>
			</aside>
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
