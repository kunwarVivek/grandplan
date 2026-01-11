import { Link, createFileRoute } from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowDownIcon,
	ArrowUpIcon,
	BarChart3Icon,
	BuildingIcon,
	CheckCircle2Icon,
	CreditCardIcon,
	DollarSignIcon,
	Loader2Icon,
	RefreshCwIcon,
	SparklesIcon,
	UsersIcon,
} from "lucide-react";

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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import {
	useAnalyticsGrowth,
	useAnalyticsOverview,
	useAnalyticsRevenue,
	useAnalyticsUsage,
} from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const {
		data: overview,
		isLoading: overviewLoading,
		isError: overviewError,
		refetch: refetchOverview,
	} = useAnalyticsOverview();

	const {
		data: revenue,
		isLoading: revenueLoading,
		isError: revenueError,
		refetch: refetchRevenue,
	} = useAnalyticsRevenue();

	const {
		data: usage,
		isLoading: usageLoading,
		refetch: refetchUsage,
	} = useAnalyticsUsage();

	const {
		data: growth,
		isLoading: growthLoading,
		refetch: refetchGrowth,
	} = useAnalyticsGrowth();

	const isLoading = overviewLoading || revenueLoading;
	const isError = overviewError || revenueError;

	const handleRefresh = () => {
		refetchOverview();
		refetchRevenue();
		refetchUsage();
		refetchGrowth();
	};

	// Format currency (assuming cents)
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount / 100);
	};

	// Format large numbers
	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		}
		if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toLocaleString();
	};

	const statCards = [
		{
			title: "Total Users",
			value: formatNumber(overview?.totalUsers ?? 0),
			description: `${formatNumber(overview?.activeUsers ?? 0)} active (30 days)`,
			change: overview?.userGrowthPercent ?? 0,
			icon: UsersIcon,
			subtext: `+${overview?.newUsersThisPeriod ?? 0} this period`,
		},
		{
			title: "Organizations",
			value: formatNumber(overview?.totalOrganizations ?? 0),
			description: `${formatNumber(overview?.activeOrganizations ?? 0)} active`,
			change: overview?.orgGrowthPercent ?? 0,
			icon: BuildingIcon,
			subtext: `+${overview?.newOrgsThisPeriod ?? 0} this period`,
		},
		{
			title: "MRR",
			value: formatCurrency(revenue?.mrr ?? 0),
			description: `ARR: ${formatCurrency(revenue?.arr ?? 0)}`,
			change: revenue?.mrrGrowthPercent ?? 0,
			icon: CreditCardIcon,
			subtext: `Churn: ${(revenue?.churnRate ?? 0).toFixed(1)}%`,
		},
		{
			title: "Total Revenue",
			value: formatCurrency(revenue?.totalRevenue ?? 0),
			description: `This period: ${formatCurrency(revenue?.revenueThisPeriod ?? 0)}`,
			change: revenue?.revenueGrowthPercent ?? 0,
			icon: DollarSignIcon,
			subtext: `ARPU: ${formatCurrency(revenue?.averageRevenuePerUser ?? 0)}`,
		},
	];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Admin Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Real-time platform metrics and activity from your database.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRefresh}
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2Icon className="mr-2 size-4 animate-spin" />
					) : (
						<RefreshCwIcon className="mr-2 size-4" />
					)}
					Refresh
				</Button>
			</div>

			{isError ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<p className="mb-4 text-muted-foreground">
							Failed to load platform stats
						</p>
						<Button variant="outline" onClick={handleRefresh}>
							<RefreshCwIcon className="mr-2 size-4" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Main Stats Cards */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{statCards.map((stat) => (
							<Card key={stat.title}>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="font-medium text-sm">
										{stat.title}
									</CardTitle>
									<stat.icon className="size-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									{isLoading ? (
										<>
											<Skeleton className="mb-2 h-8 w-24" />
											<Skeleton className="h-4 w-32" />
										</>
									) : (
										<>
											<div className="font-bold text-2xl">{stat.value}</div>
											<div className="flex items-center gap-1 text-muted-foreground text-xs">
												{stat.change !== 0 && (
													<>
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
															{Math.abs(stat.change).toFixed(1)}%
														</span>
													</>
												)}
												<span>vs last period</span>
											</div>
											<p className="mt-1 text-muted-foreground text-xs">
												{stat.subtext}
											</p>
										</>
									)}
								</CardContent>
							</Card>
						))}
					</div>

					{/* Secondary Stats Row */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="font-medium text-sm">
									Total Projects
								</CardTitle>
								<BarChart3Icon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								{overviewLoading ? (
									<Skeleton className="h-8 w-20" />
								) : (
									<div className="font-bold text-2xl">
										{formatNumber(overview?.totalProjects ?? 0)}
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="font-medium text-sm">
									Total Tasks
								</CardTitle>
								<CheckCircle2Icon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								{overviewLoading ? (
									<Skeleton className="h-8 w-20" />
								) : (
									<>
										<div className="font-bold text-2xl">
											{formatNumber(overview?.totalTasks ?? 0)}
										</div>
										<div className="mt-2 space-y-1">
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">Completion Rate</span>
												<span className="font-medium">
													{(overview?.taskCompletionRate ?? 0).toFixed(1)}%
												</span>
											</div>
											<Progress
												value={overview?.taskCompletionRate ?? 0}
												className="h-1.5"
											/>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="font-medium text-sm">
									AI Credits Used
								</CardTitle>
								<SparklesIcon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								{overviewLoading ? (
									<Skeleton className="h-8 w-20" />
								) : (
									<>
										<div className="font-bold text-2xl">
											{formatNumber(overview?.totalAICreditsUsed ?? 0)}
										</div>
										<p className="text-muted-foreground text-xs">
											{formatNumber(overview?.aiCreditsUsedThisPeriod ?? 0)} this period
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="font-medium text-sm">
									Active Sessions
								</CardTitle>
								<ActivityIcon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								{usageLoading ? (
									<Skeleton className="h-8 w-20" />
								) : (
									<>
										<div className="font-bold text-2xl">
											{formatNumber(usage?.activeSessionsToday ?? 0)}
										</div>
										<p className="text-muted-foreground text-xs">Today</p>
									</>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Charts and Activity Section */}
					<div className="grid gap-4 lg:grid-cols-2">
						{/* Growth Trends Card */}
						<Card>
							<CardHeader>
								<CardTitle>Growth Trends</CardTitle>
								<CardDescription>User signups and organization growth over time</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs defaultValue="users">
									<TabsList className="mb-4">
										<TabsTrigger value="users">User Signups</TabsTrigger>
										<TabsTrigger value="orgs">Organizations</TabsTrigger>
										<TabsTrigger value="subs">Subscriptions</TabsTrigger>
									</TabsList>
									<TabsContent value="users">
										{growthLoading ? (
											<ChartSkeleton />
										) : growth?.userSignups && growth.userSignups.length > 0 ? (
											<GrowthChart
												data={growth.userSignups.slice(-30)}
												label="Signups"
												color="hsl(var(--primary))"
											/>
										) : (
											<EmptyChartState />
										)}
									</TabsContent>
									<TabsContent value="orgs">
										{growthLoading ? (
											<ChartSkeleton />
										) : growth?.orgCreations && growth.orgCreations.length > 0 ? (
											<GrowthChart
												data={growth.orgCreations.slice(-30)}
												label="Organizations"
												color="hsl(var(--chart-2))"
											/>
										) : (
											<EmptyChartState />
										)}
									</TabsContent>
									<TabsContent value="subs">
										{growthLoading ? (
											<ChartSkeleton />
										) : growth?.subscriptionActivations && growth.subscriptionActivations.length > 0 ? (
											<GrowthChart
												data={growth.subscriptionActivations.slice(-30)}
												label="Subscriptions"
												color="hsl(var(--chart-3))"
											/>
										) : (
											<EmptyChartState />
										)}
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>

						{/* Revenue Chart */}
						<Card>
							<CardHeader>
								<CardTitle>Revenue History</CardTitle>
								<CardDescription>Monthly revenue and MRR trends</CardDescription>
							</CardHeader>
							<CardContent>
								{revenueLoading ? (
									<ChartSkeleton />
								) : revenue?.revenueHistory && revenue.revenueHistory.length > 0 ? (
									<RevenueChart data={revenue.revenueHistory} />
								) : (
									<EmptyChartState />
								)}
							</CardContent>
						</Card>
					</div>

					{/* Usage and Quick Actions Row */}
					<div className="grid gap-4 lg:grid-cols-2">
						{/* Top Organizations by Usage */}
						<Card>
							<CardHeader>
								<CardTitle>Top Organizations</CardTitle>
								<CardDescription>By AI credits usage this period</CardDescription>
							</CardHeader>
							<CardContent>
								{usageLoading ? (
									<div className="space-y-3">
										{Array.from({ length: 5 }).map((_, i) => (
											<Skeleton key={i} className="h-10 w-full" />
										))}
									</div>
								) : usage?.usageByOrganization && usage.usageByOrganization.length > 0 ? (
									<div className="space-y-3">
										{usage.usageByOrganization.slice(0, 5).map((org, index) => (
											<div
												key={org.orgId}
												className="flex items-center justify-between rounded-lg border p-3"
											>
												<div className="flex items-center gap-3">
													<span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
														{index + 1}
													</span>
													<div>
														<p className="font-medium text-sm">{org.orgName}</p>
														<p className="text-muted-foreground text-xs">
															{org.activeUsers} active users
														</p>
													</div>
												</div>
												<div className="text-right">
													<p className="font-medium text-sm">
														{formatNumber(org.aiCreditsUsed)} credits
													</p>
													<p className="text-muted-foreground text-xs">
														{formatNumber(org.tasksCreated)} tasks
													</p>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="py-8 text-center text-muted-foreground text-sm">
										No usage data available yet
									</p>
								)}
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<Card>
							<CardHeader>
								<CardTitle>Quick Actions</CardTitle>
								<CardDescription>Common administrative tasks</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-2">
									<Link
										to="/admin/users"
										className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
									>
										<UsersIcon className="size-5 text-muted-foreground" />
										<div>
											<p className="font-medium text-sm">Manage Users</p>
											<p className="text-muted-foreground text-xs">
												View and manage all platform users
											</p>
										</div>
									</Link>
									<Link
										to="/admin/organizations"
										className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
									>
										<BuildingIcon className="size-5 text-muted-foreground" />
										<div>
											<p className="font-medium text-sm">Manage Organizations</p>
											<p className="text-muted-foreground text-xs">
												View and manage all organizations
											</p>
										</div>
									</Link>
									<Link
										to="/admin/plans"
										className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
									>
										<CreditCardIcon className="size-5 text-muted-foreground" />
										<div>
											<p className="font-medium text-sm">Subscription Plans</p>
											<p className="text-muted-foreground text-xs">
												Configure subscription tiers and pricing
											</p>
										</div>
									</Link>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Subscription Breakdown */}
					{revenue?.subscriptionsByPlan && revenue.subscriptionsByPlan.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Subscriptions by Plan</CardTitle>
								<CardDescription>Current active subscriptions breakdown</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
									{revenue.subscriptionsByPlan.map((plan) => (
										<div
											key={plan.planId}
											className="rounded-lg border p-4"
										>
											<div className="flex items-center justify-between">
												<span className="font-medium">{plan.planName}</span>
												<span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
													{plan.count} subscribers
												</span>
											</div>
											<p className="mt-2 font-bold text-lg">
												{formatCurrency(plan.revenue)}
											</p>
											<p className="text-muted-foreground text-xs">monthly revenue</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Retention Cohorts */}
					{growth?.retentionCohorts && growth.retentionCohorts.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Retention Cohorts</CardTitle>
								<CardDescription>User retention by signup month</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b">
												<th className="pb-2 text-left font-medium">Cohort</th>
												<th className="pb-2 text-left font-medium">Users</th>
												<th className="pb-2 text-center font-medium">Month 1</th>
												<th className="pb-2 text-center font-medium">Month 2</th>
												<th className="pb-2 text-center font-medium">Month 3</th>
												<th className="pb-2 text-center font-medium">Month 4</th>
												<th className="pb-2 text-center font-medium">Month 5</th>
												<th className="pb-2 text-center font-medium">Month 6</th>
											</tr>
										</thead>
										<tbody>
											{growth.retentionCohorts.map((cohort) => (
												<tr key={cohort.cohortMonth} className="border-b last:border-0">
													<td className="py-2 font-medium">{cohort.cohortMonth}</td>
													<td className="py-2">{cohort.initialUsers}</td>
													{Array.from({ length: 6 }).map((_, i) => (
														<td key={i} className="py-2 text-center">
															{cohort.retentionByMonth[i] !== undefined ? (
																<span
																	className={cn(
																		"rounded px-1.5 py-0.5 text-xs font-medium",
																		cohort.retentionByMonth[i] >= 80
																			? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
																			: cohort.retentionByMonth[i] >= 50
																				? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
																				: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
																	)}
																>
																	{cohort.retentionByMonth[i]}%
																</span>
															) : (
																<span className="text-muted-foreground">-</span>
															)}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
}

// Helper Components

function ChartSkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-8 w-32" />
			<Skeleton className="h-48 w-full" />
		</div>
	);
}

function EmptyChartState() {
	return (
		<div className="flex h-48 items-center justify-center text-muted-foreground">
			<p className="text-sm">No data available yet</p>
		</div>
	);
}

type GrowthChartProps = {
	data: Array<{ date: string; count: number }>;
	label: string;
	color: string;
};

function GrowthChart({ data, label, color }: GrowthChartProps) {
	const values = data.map((d) => d.count);
	const maxValue = Math.max(...values, 1);
	const total = values.reduce((a, b) => a + b, 0);

	const chartWidth = 100;
	const chartHeight = 40;
	const padding = 2;

	// Calculate points for the line
	const points = values.map((value, index) => {
		const x =
			padding + (index / (values.length - 1 || 1)) * (chartWidth - 2 * padding);
		const y =
			chartHeight - padding - (value / maxValue) * (chartHeight - 2 * padding);
		return { x, y, value };
	});

	// Create SVG path
	const linePath = points
		.map((point, i) =>
			i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
		)
		.join(" ");

	// Create area path
	const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-baseline gap-2">
				<span className="font-bold text-2xl">{total.toLocaleString()}</span>
				<span className="text-muted-foreground text-sm">total {label.toLowerCase()}</span>
			</div>

			<div className="relative h-48">
				<svg
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					className="h-full w-full"
					preserveAspectRatio="none"
				>
					<defs>
						<linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity="0.2" />
							<stop offset="100%" stopColor={color} stopOpacity="0" />
						</linearGradient>
					</defs>

					{/* Grid lines */}
					{[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
						<line
							key={ratio}
							x1={padding}
							y1={padding + ratio * (chartHeight - 2 * padding)}
							x2={chartWidth - padding}
							y2={padding + ratio * (chartHeight - 2 * padding)}
							stroke="currentColor"
							strokeOpacity="0.1"
							strokeWidth="0.2"
						/>
					))}

					{/* Area */}
					<path d={areaPath} fill={`url(#gradient-${label})`} />

					{/* Line */}
					<path
						d={linePath}
						fill="none"
						stroke={color}
						strokeWidth="0.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>

				{/* Y-axis labels */}
				<div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between py-2 text-muted-foreground text-xs">
					<span>{maxValue}</span>
					<span>{Math.round(maxValue / 2)}</span>
					<span>0</span>
				</div>
			</div>

			{/* X-axis labels */}
			<div className="flex justify-between text-muted-foreground text-xs">
				{data.length > 0 && (
					<>
						<span>{formatDate(data[0].date)}</span>
						{data.length > 2 && (
							<span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
						)}
						<span>{formatDate(data[data.length - 1].date)}</span>
					</>
				)}
			</div>
		</div>
	);
}

type RevenueChartProps = {
	data: Array<{ date: string; revenue: number; mrr: number }>;
};

function RevenueChart({ data }: RevenueChartProps) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount / 100);
	};

	const revenues = data.map((d) => d.revenue);
	const maxValue = Math.max(...revenues, 1);
	const totalRevenue = revenues.reduce((a, b) => a + b, 0);
	const latestMRR = data[data.length - 1]?.mrr ?? 0;

	const chartWidth = 100;
	const chartHeight = 40;
	const padding = 2;
	const barWidth = (chartWidth - 2 * padding) / data.length - 1;

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { month: "short" });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-baseline justify-between">
				<div>
					<span className="font-bold text-2xl">{formatCurrency(totalRevenue)}</span>
					<span className="ml-2 text-muted-foreground text-sm">total revenue</span>
				</div>
				<div className="text-right">
					<span className="text-muted-foreground text-sm">Current MRR: </span>
					<span className="font-semibold">{formatCurrency(latestMRR)}</span>
				</div>
			</div>

			<div className="relative h-48">
				<svg
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					className="h-full w-full"
					preserveAspectRatio="none"
				>
					{/* Bars */}
					{data.map((item, index) => {
						const barHeight = (item.revenue / maxValue) * (chartHeight - 2 * padding);
						const x = padding + index * (barWidth + 1);
						const y = chartHeight - padding - barHeight;

						return (
							<rect
								key={item.date}
								x={x}
								y={y}
								width={barWidth}
								height={barHeight}
								fill="hsl(var(--primary))"
								opacity={0.8}
								rx="0.5"
							/>
						);
					})}
				</svg>

				{/* Y-axis labels */}
				<div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between py-2 text-muted-foreground text-xs">
					<span>{formatCurrency(maxValue)}</span>
					<span>{formatCurrency(maxValue / 2)}</span>
					<span>$0</span>
				</div>
			</div>

			{/* X-axis labels */}
			<div className="flex justify-between text-muted-foreground text-xs">
				{data.length > 0 && (
					<>
						<span>{formatDate(data[0].date)}</span>
						{data.length > 2 && (
							<span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
						)}
						<span>{formatDate(data[data.length - 1].date)}</span>
					</>
				)}
			</div>
		</div>
	);
}
