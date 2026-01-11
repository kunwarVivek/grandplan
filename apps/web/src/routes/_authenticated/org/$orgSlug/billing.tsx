import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	CreditCardIcon,
	ExternalLinkIcon,
	Loader2Icon,
	SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useCreateBillingPortal,
	useCreateCheckout,
	usePlans,
	useSubscription,
	useUsage,
} from "@/features/billing/hooks/use-billing";
import type { BillingInterval, Plan, Subscription, UsageMetric } from "@/features/billing/types";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/billing")({
	component: OrgBilling,
});

// Plan change types
type PlanChangeType = "upgrade" | "downgrade" | "switch";

interface PlanChangeDialogState {
	isOpen: boolean;
	targetPlan: Plan | null;
	changeType: PlanChangeType;
}

// Determine the type of plan change
function determinePlanChangeType(
	currentPlan: Plan | null,
	targetPlan: Plan,
): PlanChangeType {
	if (!currentPlan) return "upgrade";
	const currentPrice = currentPlan.monthlyPrice ?? 0;
	const targetPrice = targetPlan.monthlyPrice ?? 0;
	if (targetPrice > currentPrice) return "upgrade";
	if (targetPrice < currentPrice) return "downgrade";
	return "switch";
}

// Get plan change implications text
function getPlanChangeImplications(
	changeType: PlanChangeType,
	currentPlan: Plan | null,
	targetPlan: Plan,
): string[] {
	const implications: string[] = [];

	if (changeType === "upgrade") {
		implications.push(
			"Your new plan will be activated immediately after payment.",
		);
		implications.push(
			"You will be charged a prorated amount for the remainder of your billing cycle.",
		);
		if (targetPlan.limits.members > (currentPlan?.limits.members ?? 0)) {
			implications.push(
				`Your team member limit will increase to ${targetPlan.limits.members === -1 ? "unlimited" : targetPlan.limits.members}.`,
			);
		}
	} else if (changeType === "downgrade") {
		implications.push(
			"Your current plan benefits will remain active until the end of your billing period.",
		);
		implications.push(
			"The new plan will take effect at the start of your next billing cycle.",
		);
		if ((currentPlan?.limits.members ?? 0) > targetPlan.limits.members) {
			implications.push(
				`Warning: Your team member limit will decrease to ${targetPlan.limits.members}. You may need to remove members before downgrading.`,
			);
		}
	}

	return implications;
}

function OrgBilling() {
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("monthly");
	const [planChangeDialog, setPlanChangeDialog] =
		useState<PlanChangeDialogState>({
			isOpen: false,
			targetPlan: null,
			changeType: "upgrade",
		});
	const [isProcessing, setIsProcessing] = useState(false);

	// Data fetching hooks
	const {
		data: subscriptionResponse,
		isLoading: isLoadingSubscription,
		error: subscriptionError,
	} = useSubscription();
	const { data: plansResponse, isLoading: isLoadingPlans } = usePlans();
	const { data: usageResponse, isLoading: isLoadingUsage } = useUsage();

	// Mutations
	const createCheckout = useCreateCheckout();
	const createBillingPortal = useCreateBillingPortal();

	// Extract data with proper typing - hooks now return unwrapped data
	const subscription = subscriptionResponse as Subscription | null | undefined;
	const plans = (plansResponse as Plan[] | undefined) ?? [];
	const usage = usageResponse;

	// Current plan from subscription
	const currentPlan = subscription?.plan ?? null;

	// Open plan change dialog
	function handlePlanChangeRequest(targetPlan: Plan) {
		const changeType = determinePlanChangeType(currentPlan, targetPlan);
		setPlanChangeDialog({
			isOpen: true,
			targetPlan,
			changeType,
		});
	}

	// Close dialog
	function closePlanChangeDialog() {
		setPlanChangeDialog({
			isOpen: false,
			targetPlan: null,
			changeType: "upgrade",
		});
	}

	// Execute plan change
	async function handleConfirmPlanChange() {
		if (!planChangeDialog.targetPlan) return;

		setIsProcessing(true);
		const { targetPlan, changeType } = planChangeDialog;

		try {
			const successUrl = `${window.location.origin}${window.location.pathname}?checkout=success`;
			const cancelUrl = `${window.location.origin}${window.location.pathname}?checkout=canceled`;

			const response = await createCheckout.mutateAsync({
				planId: targetPlan.id,
				interval: billingInterval,
				successUrl,
				cancelUrl,
			});

			if (response?.url) {
				toast.success(
					changeType === "upgrade"
						? "Redirecting to checkout..."
						: "Redirecting to confirm plan change...",
				);
				window.location.href = response.url;
			} else {
				throw new Error("No checkout URL received");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to initiate checkout";
			toast.error(message);
		} finally {
			setIsProcessing(false);
			closePlanChangeDialog();
		}
	}

	// Handle manage subscription via billing portal
	async function handleManageSubscription() {
		setIsProcessing(true);
		try {
			const response = await createBillingPortal.mutateAsync(
				window.location.href,
			);
			if (response?.url) {
				window.location.href = response.url;
			} else {
				throw new Error("No portal URL received");
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to open billing portal";
			toast.error(message);
		} finally {
			setIsProcessing(false);
		}
	}

	// Handle contact sales for enterprise
	function handleContactSales() {
		window.open("mailto:sales@grandplan.io?subject=Enterprise%20Plan%20Inquiry", "_blank");
		toast.success("Opening email client...");
	}

	// Compute usage percentage
	function getUsagePercentage(current: number, limit: number): number {
		if (limit === -1) return 0;
		return Math.min((current / limit) * 100, 100);
	}

	// Get usage color based on percentage
	function getUsageColor(percentage: number): string {
		if (percentage >= 90) return "text-destructive";
		if (percentage >= 75) return "text-amber-500";
		return "text-muted-foreground";
	}

	// Render plan action button
	function renderPlanButton(plan: Plan) {
		const isCurrentPlan = currentPlan?.id === plan.id;
		const changeType = determinePlanChangeType(currentPlan, plan);

		if (isCurrentPlan) {
			return (
				<Button variant="outline" className="w-full" disabled>
					Current Plan
				</Button>
			);
		}

		if (plan.isEnterprise) {
			return (
				<Button
					variant="outline"
					className="w-full"
					onClick={handleContactSales}
				>
					<ExternalLinkIcon className="size-3" />
					Contact Sales
				</Button>
			);
		}

		if (changeType === "downgrade") {
			return (
				<Button
					variant="outline"
					className="w-full"
					onClick={() => handlePlanChangeRequest(plan)}
					disabled={isProcessing}
				>
					{isProcessing ? (
						<Loader2Icon className="size-3 animate-spin" />
					) : (
						<ArrowDownIcon className="size-3" />
					)}
					Downgrade
				</Button>
			);
		}

		return (
			<Button
				className="w-full"
				onClick={() => handlePlanChangeRequest(plan)}
				disabled={isProcessing}
			>
				{isProcessing ? (
					<Loader2Icon className="size-3 animate-spin" />
				) : (
					<ArrowUpIcon className="size-3" />
				)}
				Upgrade
			</Button>
		);
	}

	// Render price display
	function renderPrice(plan: Plan) {
		if (plan.isEnterprise) {
			return <span className="font-bold text-2xl">Custom</span>;
		}

		const price =
			billingInterval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
		const displayPrice = billingInterval === "yearly" ? price / 12 : price;

		return (
			<>
				<span className="font-bold text-2xl">
					${Math.round(displayPrice ?? 0)}
				</span>
				<span className="text-muted-foreground text-sm">/month</span>
			</>
		);
	}

	// Loading state
	if (isLoadingSubscription || isLoadingPlans) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-24" />
						<Skeleton className="mt-2 h-4 w-64" />
					</CardHeader>
					<CardContent className="space-y-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-2 w-full" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-16" />
						<Skeleton className="mt-2 h-4 w-48" />
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-64 w-full" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (subscriptionError) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-destructive">
						Failed to load billing information. Please try again later.
					</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => window.location.reload()}
					>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Usage stats from API or fallback
	const usageStats: UsageMetric[] = usage?.usage ?? [];

	return (
		<div className="space-y-6">
			{/* Current Subscription Card */}
			{subscription && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<CreditCardIcon className="size-5" />
									Current Subscription
								</CardTitle>
								<CardDescription>
									Manage your subscription and billing settings.
								</CardDescription>
							</div>
							<Badge
								variant={
									subscription.status === "active" ? "default" : "secondary"
								}
							>
								{subscription.status}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-3">
							<div>
								<p className="text-muted-foreground text-xs">Plan</p>
								<p className="font-medium">{subscription.plan?.name ?? "Free"}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Billing Cycle</p>
								<p className="font-medium capitalize">{subscription.interval}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Next Billing Date</p>
								<p className="font-medium">
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</p>
							</div>
						</div>
						{subscription.cancelAtPeriodEnd && (
							<div className="mt-4 rounded-none border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
								<p className="text-amber-800 text-xs dark:text-amber-200">
									Your subscription will be canceled at the end of the current
									billing period.
								</p>
							</div>
						)}
						<div className="mt-4 flex justify-end">
							<Button
								variant="outline"
								onClick={handleManageSubscription}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<Loader2Icon className="size-3 animate-spin" />
								) : (
									<ExternalLinkIcon className="size-3" />
								)}
								Manage Subscription
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Usage Card */}
			<Card>
				<CardHeader>
					<CardTitle>Usage</CardTitle>
					<CardDescription>
						Your organization's current resource usage.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{isLoadingUsage ? (
						<>
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-2 w-full" />
								</div>
							))}
						</>
					) : usageStats.length > 0 ? (
						usageStats.map((stat) => {
							const percentage = getUsagePercentage(stat.used, stat.limit);
							return (
								<div key={stat.name} className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium">{stat.displayName}</span>
										<span className={getUsageColor(percentage)}>
											{stat.used}{" "}
											{stat.limit === -1
												? "(Unlimited)"
												: `/ ${stat.limit} ${stat.unit}`}
										</span>
									</div>
									{stat.limit !== -1 && <Progress value={percentage} />}
								</div>
							);
						})
					) : (
						<p className="text-muted-foreground text-sm">
							No usage data available.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Plans Card */}
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle>Plans</CardTitle>
							<CardDescription>
								Choose the plan that best fits your team's needs.
							</CardDescription>
						</div>
						<Tabs
							value={billingInterval}
							onValueChange={(val) =>
								setBillingInterval(val as BillingInterval)
							}
						>
							<TabsList>
								<TabsTrigger value="monthly">Monthly</TabsTrigger>
								<TabsTrigger value="yearly">
									Yearly
									<Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
										Save 20%
									</Badge>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						{plans.map((plan) => {
							const isCurrentPlan = currentPlan?.id === plan.id;
							const isPopular = plan.isPopular;

							return (
								<div
									key={plan.id}
									className={`relative rounded-none border p-4 transition-all ${
										isCurrentPlan
											? "border-primary bg-primary/5"
											: isPopular
												? "border-primary/50"
												: "border-border hover:border-primary/30"
									}`}
								>
									{isCurrentPlan && (
										<Badge className="absolute -top-2 right-4">
											Current Plan
										</Badge>
									)}
									{isPopular && !isCurrentPlan && (
										<Badge
											variant="secondary"
											className="absolute -top-2 right-4"
										>
											<SparklesIcon className="mr-1 size-3" />
											Popular
										</Badge>
									)}
									<div className="mb-4">
										<h3 className="font-semibold text-lg">{plan.name}</h3>
										<div className="mt-1 flex items-baseline gap-1">
											{renderPrice(plan)}
										</div>
										{billingInterval === "yearly" && !plan.isEnterprise && (
											<p className="mt-1 text-muted-foreground text-xs">
												Billed ${plan.yearlyPrice}/year
											</p>
										)}
										<p className="mt-1 text-muted-foreground text-xs">
											{plan.description}
										</p>
									</div>
									<ul className="mb-4 space-y-2">
										{plan.features.map((feature) => (
											<li
												key={feature.name}
												className="flex items-center gap-2 text-xs"
											>
												<CheckIcon
													className={`size-3 ${feature.included ? "text-primary" : "text-muted-foreground"}`}
												/>
												<span
													className={
														feature.included ? "" : "text-muted-foreground"
													}
												>
													{feature.name}
													{feature.limit && ` (${feature.limit})`}
												</span>
											</li>
										))}
									</ul>
									{renderPlanButton(plan)}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* Plan Change Confirmation Dialog */}
			<AlertDialog
				open={planChangeDialog.isOpen}
				onOpenChange={(open) => {
					if (!open) closePlanChangeDialog();
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{planChangeDialog.changeType === "upgrade"
								? "Upgrade Plan"
								: planChangeDialog.changeType === "downgrade"
									? "Downgrade Plan"
									: "Switch Plan"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{planChangeDialog.targetPlan && (
								<div className="space-y-4">
									<p>
										You are about to{" "}
										{planChangeDialog.changeType === "upgrade"
											? "upgrade to"
											: planChangeDialog.changeType === "downgrade"
												? "downgrade to"
												: "switch to"}{" "}
										the <strong>{planChangeDialog.targetPlan.name}</strong>{" "}
										plan.
									</p>

									<div className="rounded-none border bg-muted/50 p-3">
										<p className="mb-2 font-medium text-foreground text-xs">
											What this means:
										</p>
										<ul className="space-y-1">
											{getPlanChangeImplications(
												planChangeDialog.changeType,
												currentPlan,
												planChangeDialog.targetPlan,
											).map((implication, index) => (
												<li
													key={index}
													className={`text-xs ${implication.startsWith("Warning") ? "text-amber-600 dark:text-amber-400" : ""}`}
												>
													{implication.startsWith("Warning") ? "⚠ " : "• "}
													{implication}
												</li>
											))}
										</ul>
									</div>

									<div className="flex items-center justify-between rounded-none border bg-muted/50 p-3">
										<span className="text-xs">New price:</span>
										<span className="font-medium">
											$
											{billingInterval === "yearly"
												? planChangeDialog.targetPlan.yearlyPrice
												: planChangeDialog.targetPlan.monthlyPrice}
											/{billingInterval === "yearly" ? "year" : "month"}
										</span>
									</div>
								</div>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isProcessing}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmPlanChange}
							disabled={isProcessing}
							variant={
								planChangeDialog.changeType === "downgrade"
									? "destructive"
									: "default"
							}
						>
							{isProcessing ? (
								<>
									<Loader2Icon className="size-3 animate-spin" />
									Processing...
								</>
							) : planChangeDialog.changeType === "upgrade" ? (
								<>
									<ArrowUpIcon className="size-3" />
									Confirm Upgrade
								</>
							) : (
								<>
									<ArrowDownIcon className="size-3" />
									Confirm Downgrade
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
