import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/billing")({
	component: OrgBilling,
});

interface Plan {
	id: string;
	name: string;
	price: string;
	description: string;
	features: string[];
	current: boolean;
}

interface UsageStat {
	name: string;
	current: number;
	limit: number;
	unit: string;
}

function OrgBilling() {
	const plans: Plan[] = [
		{
			id: "free",
			name: "Free",
			price: "$0",
			description: "For small teams getting started",
			features: ["Up to 5 team members", "10 projects", "1GB storage", "Basic support"],
			current: false,
		},
		{
			id: "pro",
			name: "Pro",
			price: "$29",
			description: "For growing teams",
			features: [
				"Up to 20 team members",
				"Unlimited projects",
				"10GB storage",
				"Priority support",
				"Advanced analytics",
			],
			current: true,
		},
		{
			id: "enterprise",
			name: "Enterprise",
			price: "Custom",
			description: "For large organizations",
			features: [
				"Unlimited team members",
				"Unlimited projects",
				"Unlimited storage",
				"24/7 support",
				"Custom integrations",
				"SLA guarantee",
			],
			current: false,
		},
	];

	const usageStats: UsageStat[] = [
		{ name: "Team Members", current: 8, limit: 20, unit: "members" },
		{ name: "Projects", current: 12, limit: -1, unit: "projects" },
		{ name: "Storage", current: 4.2, limit: 10, unit: "GB" },
		{ name: "API Calls", current: 45000, limit: 100000, unit: "calls/month" },
	];

	function handleUpgrade(planId: string) {
		// TODO: Implement plan upgrade
		console.log("Upgrade to plan:", planId);
	}

	function handleDowngrade(planId: string) {
		// TODO: Implement plan downgrade
		console.log("Downgrade to plan:", planId);
	}

	function getUsagePercentage(current: number, limit: number): number {
		if (limit === -1) return 0;
		return Math.min((current / limit) * 100, 100);
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Usage</CardTitle>
					<CardDescription>
						Your organization's current resource usage.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{usageStats.map((stat) => (
						<div key={stat.name} className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{stat.name}</span>
								<span className="text-muted-foreground">
									{stat.current}{" "}
									{stat.limit === -1 ? "(Unlimited)" : `/ ${stat.limit} ${stat.unit}`}
								</span>
							</div>
							{stat.limit !== -1 && (
								<Progress value={getUsagePercentage(stat.current, stat.limit)} />
							)}
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Plans</CardTitle>
					<CardDescription>
						Choose the plan that best fits your team's needs.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						{plans.map((plan) => (
							<div
								key={plan.id}
								className={`relative rounded-lg border p-4 ${
									plan.current ? "border-primary" : "border-border"
								}`}
							>
								{plan.current && (
									<Badge className="absolute -top-2 right-4">Current Plan</Badge>
								)}
								<div className="mb-4">
									<h3 className="text-lg font-semibold">{plan.name}</h3>
									<div className="mt-1 flex items-baseline gap-1">
										<span className="text-2xl font-bold">{plan.price}</span>
										{plan.price !== "Custom" && (
											<span className="text-sm text-muted-foreground">/month</span>
										)}
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{plan.description}
									</p>
								</div>
								<ul className="mb-4 space-y-2">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-center gap-2 text-xs">
											<CheckIcon className="size-3 text-primary" />
											{feature}
										</li>
									))}
								</ul>
								{plan.current ? (
									<Button variant="outline" className="w-full" disabled>
										Current Plan
									</Button>
								) : plan.id === "enterprise" ? (
									<Button variant="outline" className="w-full">
										Contact Sales
									</Button>
								) : plan.id === "free" ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={() => handleDowngrade(plan.id)}
									>
										Downgrade
									</Button>
								) : (
									<Button className="w-full" onClick={() => handleUpgrade(plan.id)}>
										Upgrade
									</Button>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
