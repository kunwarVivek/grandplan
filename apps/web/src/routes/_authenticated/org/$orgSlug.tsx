import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import {
	BuildingIcon,
	CreditCardIcon,
	PaletteIcon,
	UsersIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/org/$orgSlug")({
	beforeLoad: async () => {
		// Session is available from parent _authenticated layout via context.session
		// TODO: Fetch organization and check if user is admin
		// In a real app, you would fetch the org and verify the user is an admin
		const isOrgAdmin = true; // Placeholder - implement actual check

		if (!isOrgAdmin) {
			throw redirect({
				to: "/dashboard",
			});
		}
	},
	component: OrgSettingsLayout,
});

function OrgSettingsLayout() {
	const { orgSlug } = Route.useParams();

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6">
				<h1 className="font-medium text-lg">Organization Settings</h1>
				<p className="text-muted-foreground text-sm">
					Manage settings for your organization.
				</p>
			</div>

			<div className="flex flex-col gap-8 lg:flex-row">
				<aside className="w-full shrink-0 lg:w-56">
					<nav className="flex flex-col gap-1">
						<Link
							to="/org/$orgSlug"
							params={{ orgSlug }}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
							activeOptions={{ exact: true }}
						>
							<BuildingIcon className="size-4" />
							General
						</Link>
						<Link
							to="/org/$orgSlug/members"
							params={{ orgSlug }}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
						>
							<UsersIcon className="size-4" />
							Members
						</Link>
						<Link
							to="/org/$orgSlug/billing"
							params={{ orgSlug }}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
						>
							<CreditCardIcon className="size-4" />
							Billing
						</Link>
						<Link
							to="/org/$orgSlug/branding"
							params={{ orgSlug }}
							className={cn(
								"flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
								"[&.active]:bg-muted [&.active]:text-foreground",
							)}
						>
							<PaletteIcon className="size-4" />
							Branding
						</Link>
					</nav>
				</aside>
				<main className="flex-1">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
