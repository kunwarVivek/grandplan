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
import { usePlatformStats } from "../hooks/use-admin";

type AdminStatsCardsProps = {
	className?: string;
};

export function AdminStatsCards({ className }: AdminStatsCardsProps) {
	const { data, isLoading, error } = usePlatformStats();

	if (isLoading) {
		return <AdminStatsCardsSkeleton className={className} />;
	}

	if (error || !data) {
		return (
			<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
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

	// Calculate growth percentages from data
	const calculateGrowth = (
		growthData: { date: string; count?: number; amount?: number }[]
	): number => {
		if (growthData.length < 2) return 0;
		const current = growthData[growthData.length - 1];
		const previous = growthData[growthData.length - 2];
		const currentValue = current.count ?? current.amount ?? 0;
		const previousValue = previous.count ?? previous.amount ?? 0;
		if (previousValue === 0) return 0;
		return ((currentValue - previousValue) / previousValue) * 100;
	};

	const userGrowthPercent = calculateGrowth(data.userGrowth);
	const revenueGrowthPercent = calculateGrowth(data.revenueGrowth);
	const activeUserPercent =
		data.totalUsers > 0
			? ((data.activeUsers / data.totalUsers) * 100).toFixed(1)
			: 0;
	const activeOrgPercent =
		data.totalOrganizations > 0
			? ((data.activeOrganizations / data.totalOrganizations) * 100).toFixed(1)
			: 0;

	const stats = [
		{
			title: "Total Users",
			value: formatNumber(data.totalUsers),
			description: `${activeUserPercent}% active`,
			icon: Users,
			trend: userGrowthPercent,
		},
		{
			title: "Organizations",
			value: formatNumber(data.totalOrganizations),
			description: `${activeOrgPercent}% active`,
			icon: Building2,
			trend: null,
		},
		{
			title: "Total Revenue",
			value: formatCurrency(data.totalRevenue),
			description: "All time",
			icon: DollarSign,
			trend: null,
		},
		{
			title: "MRR",
			value: formatCurrency(data.monthlyRecurringRevenue),
			description: "Monthly recurring revenue",
			icon: TrendingUp,
			trend: revenueGrowthPercent,
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

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
	const isPositive = trend !== null && trend >= 0;
	const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<Icon className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					{trend !== null && (
						<span
							className={cn(
								"flex items-center gap-0.5 font-medium",
								isPositive ? "text-emerald-500" : "text-red-500"
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
						<Skeleton className="h-7 w-20 mb-1" />
						<Skeleton className="h-3 w-32" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
