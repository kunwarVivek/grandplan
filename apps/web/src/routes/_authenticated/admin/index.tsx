import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BuildingIcon,
	CreditCardIcon,
	DollarSignIcon,
	UsersIcon,
} from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
	component: AdminDashboard,
});

interface StatCard {
	title: string;
	value: string;
	description: string;
	change: number;
	icon: React.ElementType;
}

function AdminDashboard() {
	const stats: StatCard[] = [
		{
			title: "Total Users",
			value: "12,345",
			description: "Active users on the platform",
			change: 12.5,
			icon: UsersIcon,
		},
		{
			title: "Organizations",
			value: "1,234",
			description: "Registered organizations",
			change: 8.2,
			icon: BuildingIcon,
		},
		{
			title: "Subscriptions",
			value: "892",
			description: "Active paid subscriptions",
			change: 15.3,
			icon: CreditCardIcon,
		},
		{
			title: "Revenue",
			value: "$45,678",
			description: "Monthly recurring revenue",
			change: -2.4,
			icon: DollarSignIcon,
		},
	];

	const recentActivity = [
		{
			id: 1,
			type: "user",
			message: "New user registered: john@example.com",
			time: "2 minutes ago",
		},
		{
			id: 2,
			type: "org",
			message: "New organization created: Acme Corp",
			time: "15 minutes ago",
		},
		{
			id: 3,
			type: "subscription",
			message: "Subscription upgraded: Tech Startup Inc.",
			time: "1 hour ago",
		},
		{
			id: 4,
			type: "user",
			message: "User deactivated: jane@example.com",
			time: "2 hours ago",
		},
		{
			id: 5,
			type: "subscription",
			message: "New subscription: Design Agency Ltd.",
			time: "3 hours ago",
		},
	];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="font-semibold text-2xl">Admin Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Overview of your platform's metrics and activity.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-sm">
								{stat.title}
							</CardTitle>
							<stat.icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">{stat.value}</div>
							<div className="flex items-center gap-1 text-muted-foreground text-xs">
								{stat.change > 0 ? (
									<ArrowUpIcon className="size-3 text-green-500" />
								) : (
									<ArrowDownIcon className="size-3 text-red-500" />
								)}
								<span
									className={
										stat.change > 0 ? "text-green-500" : "text-red-500"
									}
								>
									{Math.abs(stat.change)}%
								</span>
								<span>from last month</span>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>Latest events on the platform</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{recentActivity.map((activity) => (
								<div key={activity.id} className="flex items-start gap-3">
									<div className="mt-0.5 size-2 rounded-full bg-primary" />
									<div className="flex-1">
										<p className="text-sm">{activity.message}</p>
										<p className="text-muted-foreground text-xs">
											{activity.time}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common administrative tasks</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-2">
							<button className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted">
								<UsersIcon className="size-5 text-muted-foreground" />
								<div>
									<p className="font-medium text-sm">Manage Users</p>
									<p className="text-muted-foreground text-xs">
										View and manage all platform users
									</p>
								</div>
							</button>
							<button className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted">
								<BuildingIcon className="size-5 text-muted-foreground" />
								<div>
									<p className="font-medium text-sm">Manage Organizations</p>
									<p className="text-muted-foreground text-xs">
										View and manage all organizations
									</p>
								</div>
							</button>
							<button className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted">
								<CreditCardIcon className="size-5 text-muted-foreground" />
								<div>
									<p className="font-medium text-sm">Subscription Plans</p>
									<p className="text-muted-foreground text-xs">
										Configure subscription tiers and pricing
									</p>
								</div>
							</button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
