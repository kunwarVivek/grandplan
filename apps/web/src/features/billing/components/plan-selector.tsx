import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	useCreateCheckout,
	usePlans,
	useSubscription,
	useUpgradePlan,
} from "../hooks/use-billing";
import type { BillingInterval, Plan } from "../types";

type PlanSelectorProps = {
	onSuccess?: () => void;
};

export function PlanSelector({ onSuccess }: PlanSelectorProps) {
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const { data: plansData, isLoading: plansLoading } = usePlans();
	const { data: subscription, isLoading: subscriptionLoading } =
		useSubscription();
	const upgradePlan = useUpgradePlan();
	const createCheckout = useCreateCheckout();

	const isLoading = plansLoading || subscriptionLoading;

	const handleSelectPlan = async (plan: Plan) => {
		if (subscription) {
			// Upgrade existing subscription
			await upgradePlan.mutateAsync({ planId: plan.id, interval });
			onSuccess?.();
		} else {
			// Create new checkout session
			const result = await createCheckout.mutateAsync({
				planId: plan.id,
				interval,
				successUrl: `${window.location.origin}/billing?success=true`,
				cancelUrl: `${window.location.origin}/billing`,
			});
			window.location.href = result.url;
		}
	};

	if (isLoading) {
		return <PlanSelectorSkeleton />;
	}

	const plans = plansData?.plans ?? [];
	const currentPlanId = subscription?.planId;

	const formatPrice = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
		}).format(amount / 100);
	};

	const getYearlySavings = (plan: Plan) => {
		const monthlyTotal = plan.monthlyPrice * 12;
		const yearlyTotal = plan.yearlyPrice;
		const savings = monthlyTotal - yearlyTotal;
		if (savings <= 0) return null;
		return Math.round((savings / monthlyTotal) * 100);
	};

	return (
		<div className="space-y-6">
			{/* Interval toggle */}
			<div className="flex items-center justify-center gap-4">
				<Button
					variant={interval === "monthly" ? "default" : "ghost"}
					size="sm"
					onClick={() => setInterval("monthly")}
				>
					Monthly
				</Button>
				<Button
					variant={interval === "yearly" ? "default" : "ghost"}
					size="sm"
					onClick={() => setInterval("yearly")}
				>
					Yearly
					<Badge variant="secondary" className="ml-2">
						Save up to 20%
					</Badge>
				</Button>
			</div>

			{/* Plans grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{plans.map((plan) => {
					const price =
						interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
					const isCurrentPlan = currentPlanId === plan.id;
					const savings = interval === "yearly" ? getYearlySavings(plan) : null;

					return (
						<Card
							key={plan.id}
							className={cn(
								"relative flex flex-col",
								plan.isPopular && "ring-2 ring-primary",
								isCurrentPlan && "ring-2 ring-emerald-500",
							)}
						>
							{plan.isPopular && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2">
									<Badge className="bg-primary text-primary-foreground">
										<Sparkles className="mr-1 size-3" />
										Most Popular
									</Badge>
								</div>
							)}
							{isCurrentPlan && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2">
									<Badge className="bg-emerald-500 text-white">
										Current Plan
									</Badge>
								</div>
							)}

							<CardHeader>
								<CardTitle>{plan.name}</CardTitle>
								<CardDescription>{plan.description}</CardDescription>
							</CardHeader>

							<CardContent className="flex-1 space-y-4">
								<div className="flex items-baseline gap-1">
									<span className="font-bold text-3xl">
										{formatPrice(price)}
									</span>
									<span className="text-muted-foreground text-sm">
										/{interval === "yearly" ? "year" : "month"}
									</span>
								</div>
								{savings && (
									<Badge variant="secondary" className="text-emerald-500">
										Save {savings}%
									</Badge>
								)}

								<ul className="space-y-2 text-sm">
									{plan.features.map((feature) => (
										<li
											key={feature.name}
											className={cn(
												"flex items-start gap-2",
												!feature.included &&
													"text-muted-foreground line-through",
											)}
										>
											<Check
												className={cn(
													"mt-0.5 size-4 shrink-0",
													feature.included
														? "text-emerald-500"
														: "text-muted-foreground",
												)}
											/>
											<span>
												{feature.name}
												{feature.limit && (
													<span className="text-muted-foreground">
														{" "}
														({feature.limit})
													</span>
												)}
											</span>
										</li>
									))}
								</ul>
							</CardContent>

							<CardFooter>
								{plan.isEnterprise ? (
									<Button variant="outline" className="w-full">
										Contact Sales
									</Button>
								) : (
									<Button
										className="w-full"
										variant={plan.isPopular ? "default" : "outline"}
										disabled={
											isCurrentPlan ||
											upgradePlan.isPending ||
											createCheckout.isPending
										}
										onClick={() => handleSelectPlan(plan)}
									>
										{isCurrentPlan
											? "Current Plan"
											: subscription
												? "Upgrade"
												: "Get Started"}
									</Button>
								)}
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

function PlanSelectorSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-center gap-4">
				<Skeleton className="h-8 w-20" />
				<Skeleton className="h-8 w-32" />
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i} className="flex flex-col">
						<CardHeader>
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-4 w-full" />
						</CardHeader>
						<CardContent className="flex-1 space-y-4">
							<Skeleton className="h-8 w-20" />
							<div className="space-y-2">
								{Array.from({ length: 5 }).map((_, j) => (
									<Skeleton key={j} className="h-4 w-full" />
								))}
							</div>
						</CardContent>
						<CardFooter>
							<Skeleton className="h-8 w-full" />
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
