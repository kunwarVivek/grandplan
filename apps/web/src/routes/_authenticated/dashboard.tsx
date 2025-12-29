import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	CheckCircle2,
	Clock,
	FolderKanban,
	Plus,
	TrendingUp,
	Users,
} from "lucide-react";

import { ContentContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getPayment } from "@/functions/get-payment";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: async () => {
		const customerState = await getPayment();
		return { customerState };
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { session, customerState } = Route.useRouteContext();

	const hasProSubscription =
		(customerState?.activeSubscriptions?.length ?? 0) > 0;

	const stats = [
		{
			title: "Active Projects",
			value: "12",
			change: "+2 this week",
			icon: FolderKanban,
			trend: "up",
		},
		{
			title: "Tasks Completed",
			value: "48",
			change: "+15 this week",
			icon: CheckCircle2,
			trend: "up",
		},
		{
			title: "Team Members",
			value: "8",
			change: "+1 this month",
			icon: Users,
			trend: "up",
		},
		{
			title: "Hours Tracked",
			value: "164",
			change: "This month",
			icon: Clock,
			trend: "neutral",
		},
	];

	const recentActivity = [
		{
			id: "1",
			user: {
				name: "Sarah Chen",
				avatar: "",
				initials: "SC",
			},
			action: "completed task",
			target: "Design system updates",
			project: "Website Redesign",
			time: "2 minutes ago",
		},
		{
			id: "2",
			user: {
				name: "Alex Rivera",
				avatar: "",
				initials: "AR",
			},
			action: "created project",
			target: "Mobile App v2",
			project: "",
			time: "1 hour ago",
		},
		{
			id: "3",
			user: {
				name: "Jordan Kim",
				avatar: "",
				initials: "JK",
			},
			action: "added comment on",
			target: "API Integration",
			project: "Backend Services",
			time: "3 hours ago",
		},
		{
			id: "4",
			user: {
				name: session?.user.name || "You",
				avatar: session?.user.image || "",
				initials:
					session?.user.name
						?.split(" ")
						.map((n) => n[0])
						.join("") || "U",
			},
			action: "joined team",
			target: "Engineering",
			project: "",
			time: "Yesterday",
		},
	];

	return (
		<ContentContainer>
			<PageHeader
				title={`Welcome back, ${session?.user.name?.split(" ")[0] || "User"}`}
				description="Here's what's happening across your projects today."
				actions={
					<div className="flex items-center gap-2">
						{hasProSubscription ? (
							<Button
								variant="outline"
								onClick={async function handlePortal() {
									await authClient.customer.portal();
								}}
							>
								Manage Subscription
							</Button>
						) : (
							<Button
								onClick={async function handleUpgrade() {
									await authClient.checkout({ slug: "pro" });
								}}
							>
								<TrendingUp className="size-4" />
								Upgrade to Pro
							</Button>
						)}
					</div>
				}
			/>

			{/* Stats Grid */}
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								{stat.title}
							</CardTitle>
							<stat.icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">{stat.value}</div>
							<p className="mt-1 text-muted-foreground text-xs">
								{stat.change}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				{/* Recent Activity */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="size-4" />
							Recent Activity
						</CardTitle>
						<CardDescription>Latest updates from your team</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{recentActivity.map((activity) => (
								<div key={activity.id} className="flex items-start gap-3">
									<Avatar size="sm">
										<AvatarImage src={activity.user.avatar} />
										<AvatarFallback>{activity.user.initials}</AvatarFallback>
									</Avatar>
									<div className="flex-1 space-y-1">
										<p className="text-sm">
											<span className="font-medium">{activity.user.name}</span>{" "}
											{activity.action}{" "}
											<span className="font-medium">{activity.target}</span>
											{activity.project && (
												<span className="text-muted-foreground">
													{" "}
													in {activity.project}
												</span>
											)}
										</p>
										<p className="text-muted-foreground text-xs">
											{activity.time}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Quick Actions */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common tasks to get you started</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3">
							<Button
								variant="outline"
								className="h-auto justify-start gap-3 p-4"
							>
								<div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
									<Plus className="size-4 text-primary" />
								</div>
								<div className="flex-1 text-left">
									<p className="font-medium">Create New Project</p>
									<p className="text-muted-foreground text-xs">
										Start a new project from scratch
									</p>
								</div>
								<ArrowRight className="size-4 text-muted-foreground" />
							</Button>
							<Button
								variant="outline"
								className="h-auto justify-start gap-3 p-4"
							>
								<div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
									<Users className="size-4 text-primary" />
								</div>
								<div className="flex-1 text-left">
									<p className="font-medium">Invite Team Members</p>
									<p className="text-muted-foreground text-xs">
										Add collaborators to your workspace
									</p>
								</div>
								<ArrowRight className="size-4 text-muted-foreground" />
							</Button>
							<Button
								variant="outline"
								className="h-auto justify-start gap-3 p-4"
							>
								<div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
									<CheckCircle2 className="size-4 text-primary" />
								</div>
								<div className="flex-1 text-left">
									<p className="font-medium">Create Task</p>
									<p className="text-muted-foreground text-xs">
										Add a new task to any project
									</p>
								</div>
								<ArrowRight className="size-4 text-muted-foreground" />
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Subscription Badge */}
			<div className="mt-6 flex items-center gap-2">
				<Badge variant={hasProSubscription ? "default" : "secondary"}>
					{hasProSubscription ? "Pro Plan" : "Free Plan"}
				</Badge>
				{!hasProSubscription && (
					<span className="text-muted-foreground text-xs">
						Upgrade to unlock more features
					</span>
				)}
			</div>
		</ContentContainer>
	);
}
