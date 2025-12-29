import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/features/notifications";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({
				to: "/login",
			});
		}
		return { session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<AppLayout
			headerRight={
				<>
					<ThemeToggle />
					<NotificationBell />
				</>
			}
		>
			<Outlet />
		</AppLayout>
	);
}
