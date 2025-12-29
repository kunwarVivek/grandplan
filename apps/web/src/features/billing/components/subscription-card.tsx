import {
	AlertTriangle,
	CalendarDays,
	CheckCircle,
	CreditCard,
} from "lucide-react";
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
import {
	useCreateBillingPortal,
	useResumeSubscription,
	useSubscription,
} from "../hooks/use-billing";
import { PLAN_TIER_CONFIG, SUBSCRIPTION_STATUS_CONFIG } from "../types";

type SubscriptionCardProps = {
	onManagePlan?: () => void;
};

export function SubscriptionCard({ onManagePlan }: SubscriptionCardProps) {
	const { data: subscription, isLoading, error } = useSubscription();
	const createPortal = useCreateBillingPortal();
	const resumeSubscription = useResumeSubscription();

	const handleManageBilling = async () => {
		const result = await createPortal.mutateAsync(window.location.href);
		window.location.href = result.url;
	};

	const handleResume = () => {
		resumeSubscription.mutate();
	};

	if (isLoading) {
		return <SubscriptionCardSkeleton />;
	}

	if (error || !subscription) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Subscription</CardTitle>
					<CardDescription>
						Unable to load subscription information
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						There was an error loading your subscription. Please try again
						later.
					</p>
				</CardContent>
			</Card>
		);
	}

	const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription.status];
	const tierConfig = PLAN_TIER_CONFIG[subscription.plan.tier];
	const isTrialing = subscription.status === "trialing";
	const isCanceled =
		subscription.cancelAtPeriodEnd || subscription.status === "canceled";
	const isPastDue = subscription.status === "past_due";

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatPrice = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount / 100);
	};

	const price =
		subscription.interval === "yearly"
			? subscription.plan.yearlyPrice
			: subscription.plan.monthlyPrice;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="flex items-center gap-2">
							{subscription.plan.name}
							<Badge className={tierConfig.color}>{tierConfig.label}</Badge>
						</CardTitle>
						<CardDescription>{subscription.plan.description}</CardDescription>
					</div>
					<Badge className={statusConfig.color}>{statusConfig.label}</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-baseline gap-1">
					<span className="font-bold text-3xl">{formatPrice(price)}</span>
					<span className="text-muted-foreground text-sm">
						/{subscription.interval === "yearly" ? "year" : "month"}
					</span>
				</div>

				<div className="space-y-2 text-sm">
					<div className="flex items-center gap-2 text-muted-foreground">
						<CalendarDays className="size-4" />
						<span>
							{isTrialing ? "Trial ends" : "Current period ends"}:{" "}
							{formatDate(
								isTrialing && subscription.trialEnd
									? subscription.trialEnd
									: subscription.currentPeriodEnd,
							)}
						</span>
					</div>

					{isCanceled && !subscription.canceledAt && (
						<div className="flex items-center gap-2 text-amber-500">
							<AlertTriangle className="size-4" />
							<span>
								Subscription will end on{" "}
								{formatDate(subscription.currentPeriodEnd)}
							</span>
						</div>
					)}

					{isPastDue && (
						<div className="flex items-center gap-2 text-red-500">
							<AlertTriangle className="size-4" />
							<span>
								Payment is past due. Please update your payment method.
							</span>
						</div>
					)}

					{subscription.status === "active" && !isCanceled && (
						<div className="flex items-center gap-2 text-emerald-500">
							<CheckCircle className="size-4" />
							<span>Your subscription is active</span>
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter className="flex gap-2">
				{isCanceled && subscription.status !== "canceled" ? (
					<Button
						onClick={handleResume}
						disabled={resumeSubscription.isPending}
					>
						{resumeSubscription.isPending
							? "Resuming..."
							: "Resume Subscription"}
					</Button>
				) : (
					<Button variant="outline" onClick={onManagePlan}>
						Change Plan
					</Button>
				)}
				<Button
					variant="outline"
					onClick={handleManageBilling}
					disabled={createPortal.isPending}
				>
					<CreditCard className="size-4" data-icon="inline-start" />
					{createPortal.isPending ? "Loading..." : "Manage Billing"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function SubscriptionCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
					<Skeleton className="h-5 w-16" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-8 w-24" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</CardContent>
			<CardFooter className="flex gap-2">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-32" />
			</CardFooter>
		</Card>
	);
}
