import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	DollarSign,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	useAnalyticsOverview,
	useAnalyticsRevenue,
} from "../hooks/use-admin";

type AdminStatsCardsProps = {
	className?: string;
};

export function AdminStatsCards({ className }: AdminStatsCardsProps) {
	const { data: overview, isLoading: overviewLoading, error: overviewError } = useAnalyticsOverview();
	const { data: revenue, isLoading: revenueLoading, error: revenueError } = useAnalyticsRevenue();

	const isLoading = overviewLoading || revenueLoading;
	const hasError = overviewError || revenueError;

	if (isLoading) {
		return <AdminStatsCardsSkeleton className={className} />;
	}

	if (hasError || (!overview && !revenue)) {
		return (
			<div
				className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}
			>
				<Card>
					<CardHeader>
						<CardTitle>Statistics</CardTitle>
						<CardDescription>Unable to load statistics</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount / 100);
	};

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		}
		if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toLocaleString();
	};

	// Calculate percentages from real data
	const activeUserPercent =
		overview && overview.totalUsers > 0
			? ((overview.activeUsers / overview.totalUsers) * 100).toFixed(1)
			: 0;
	const activeOrgPercent =
		overview && overview.totalOrganizations > 0
			? ((overview.activeOrganizations / overview.totalOrganizations) * 100).toFixed(1)
			: 0;

	const stats = [
		{
			title: "Total Users",
			value: formatNumber(overview?.totalUsers ?? 0),
			description: `${activeUserPercent}% active (30 days)`,
			icon: Users,
			trend: overview?.userGrowthPercent ?? null,
		},
		{
			title: "Organizations",
			value: formatNumber(overview?.totalOrganizations ?? 0),
			description: `${activeOrgPercent}% active`,
			icon: Building2,
			trend: overview?.orgGrowthPercent ?? null,
		},
		{
			title: "Total Revenue",
			value: formatCurrency(revenue?.totalRevenue ?? 0),
			description: "All time",
			icon: DollarSign,
			trend: revenue?.revenueGrowthPercent ?? null,
		},
		{
			title: "MRR",
			value: formatCurrency(revenue?.mrr ?? 0),
			description: `ARR: ${formatCurrency(revenue?.arr ?? 0)}`,
			icon: TrendingUp,
			trend: revenue?.mrrGrowthPercent ?? null,
		},
	];

	return (
		<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
			{stats.map((stat) => (
				<StatCard key={stat.title} {...stat} />
			))}
		</div>
	);
}

type StatCardProps = {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	trend: number | null;
};

function StatCard({
	title,
	value,
	description,
	icon: Icon,
	trend,
}: StatCardProps) {
	const hasTrend = trend !== null && trend !== 0;
	const isPositive = trend !== null && trend >= 0;
	const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					{title}
				</CardTitle>
				<Icon className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl">{value}</div>
				<div className="flex items-center gap-1 text-muted-foreground text-xs">
					{hasTrend && (
						<span
							className={cn(
								"flex items-center gap-0.5 font-medium",
								isPositive ? "text-emerald-500" : "text-red-500",
							)}
						>
							<TrendIcon className="size-3" />
							{Math.abs(trend).toFixed(1)}%
						</span>
					)}
					<span>{description}</span>
				</div>
			</CardContent>
		</Card>
	);
}

function AdminStatsCardsSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
			{Array.from({ length: 4 }).map((_, i) => (
				<Card key={i}>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="size-4" />
					</CardHeader>
					<CardContent>
						<Skeleton className="mb-1 h-7 w-20" />
						<Skeleton className="h-3 w-32" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
