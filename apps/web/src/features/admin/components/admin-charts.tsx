import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	useAnalyticsGrowth,
	useAnalyticsRevenue,
	useAnalyticsUsage,
} from "../hooks/use-admin";

type AdminChartsProps = {
	className?: string;
};

export function AdminCharts({ className }: AdminChartsProps) {
	const { data: growth, isLoading: growthLoading, error: growthError } = useAnalyticsGrowth();
	const { data: revenue, isLoading: revenueLoading, error: revenueError } = useAnalyticsRevenue();
	const { data: usage, isLoading: usageLoading } = useAnalyticsUsage();

	const isLoading = growthLoading || revenueLoading;
	const hasError = growthError || revenueError;

	if (isLoading) {
		return <AdminChartsSkeleton className={className} />;
	}

	if (hasError) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Analytics</CardTitle>
					<CardDescription>Unable to load chart data</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Platform Analytics</CardTitle>
				<CardDescription>User growth and revenue trends from real-time data</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="users">
					<TabsList className="mb-4">
						<TabsTrigger value="users">User Growth</TabsTrigger>
						<TabsTrigger value="revenue">Revenue</TabsTrigger>
						<TabsTrigger value="usage">Usage</TabsTrigger>
					</TabsList>
					<TabsContent value="users">
						{growth?.userSignups && growth.userSignups.length > 0 ? (
							<LineChart
								data={growth.userSignups.slice(-30)}
								valueKey="count"
								label="Signups"
								color="hsl(var(--primary))"
							/>
						) : (
							<EmptyChartState />
						)}
					</TabsContent>
					<TabsContent value="revenue">
						{revenue?.revenueHistory && revenue.revenueHistory.length > 0 ? (
							<BarChart
								data={revenue.revenueHistory}
								color="hsl(var(--chart-2))"
							/>
						) : (
							<EmptyChartState />
						)}
					</TabsContent>
					<TabsContent value="usage">
						{usageLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-8 w-32" />
								<Skeleton className="h-64 w-full" />
							</div>
						) : usage?.usageHistory && usage.usageHistory.length > 0 ? (
							<UsageChart data={usage.usageHistory.slice(-30)} />
						) : (
							<EmptyChartState />
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

function EmptyChartState() {
	return (
		<div className="flex h-64 items-center justify-center text-muted-foreground">
			<p className="text-sm">No data available yet</p>
		</div>
	);
}

type LineChartProps<T extends { date: string }> = {
	data: T[];
	valueKey: keyof T;
	label: string;
	color: string;
	formatValue?: (value: number) => string;
};

function LineChart<T extends { date: string }>({
	data,
	valueKey,
	label,
	color,
	formatValue = (v) => v.toLocaleString(),
}: LineChartProps<T>) {
	if (data.length === 0) {
		return <EmptyChartState />;
	}

	const values = data.map((d) => Number(d[valueKey] ?? 0));
	const maxValue = Math.max(...values, 1);
	const minValue = Math.min(...values);
	const range = maxValue - minValue || 1;
	const total = values.reduce((a, b) => a + b, 0);

	const chartWidth = 100;
	const chartHeight = 50;
	const padding = 2;

	// Calculate points for the line
	const points = values.map((value, index) => {
		const x =
			padding + (index / (values.length - 1 || 1)) * (chartWidth - 2 * padding);
		const y =
			chartHeight -
			padding -
			((value - minValue) / range) * (chartHeight - 2 * padding);
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

	// Format dates for labels
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	};

	const currentValue = values[values.length - 1] ?? 0;
	const previousValue = values[values.length - 2] ?? values[0] ?? 0;
	const change =
		previousValue !== 0
			? ((currentValue - previousValue) / previousValue) * 100
			: 0;

	return (
		<div className="space-y-4">
			<div className="flex items-baseline gap-2">
				<span className="font-bold text-3xl">{total.toLocaleString()}</span>
				<span className="text-muted-foreground text-sm">total {label.toLowerCase()}</span>
				{change !== 0 && (
					<span
						className={cn(
							"font-medium text-sm",
							change >= 0 ? "text-emerald-500" : "text-red-500",
						)}
					>
						{change >= 0 ? "+" : ""}
						{change.toFixed(1)}% vs previous
					</span>
				)}
			</div>

			<div className="relative h-64">
				<svg
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					className="h-full w-full"
					preserveAspectRatio="none"
				>
					{/* Grid lines */}
					<defs>
						<linearGradient
							id={`gradient-${label}`}
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="0%" stopColor={color} stopOpacity="0.2" />
							<stop offset="100%" stopColor={color} stopOpacity="0" />
						</linearGradient>
					</defs>

					{/* Horizontal grid lines */}
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

					{/* Data points */}
					{points.map((point, i) => (
						<circle
							key={i}
							cx={point.x}
							cy={point.y}
							r="0.8"
							fill={color}
							className="opacity-0 transition-opacity hover:opacity-100"
						/>
					))}
				</svg>

				{/* Y-axis labels */}
				<div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between py-2 text-muted-foreground text-xs">
					<span>{formatValue(maxValue)}</span>
					<span>{formatValue((maxValue + minValue) / 2)}</span>
					<span>{formatValue(minValue)}</span>
				</div>
			</div>

			{/* X-axis labels */}
			<div className="flex justify-between text-muted-foreground text-xs">
				{data.length > 0 && (
					<>
						<span>{formatDate((data[0] as { date: string }).date)}</span>
						{data.length > 2 && (
							<span>
								{formatDate(
									(data[Math.floor(data.length / 2)] as { date: string }).date,
								)}
							</span>
						)}
						<span>
							{formatDate((data[data.length - 1] as { date: string }).date)}
						</span>
					</>
				)}
			</div>
		</div>
	);
}

type BarChartProps = {
	data: Array<{ date: string; revenue: number; mrr: number }>;
	color: string;
};

function BarChart({ data, color }: BarChartProps) {
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
	const chartHeight = 50;
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
					<span className="font-bold text-3xl">{formatCurrency(totalRevenue)}</span>
					<span className="ml-2 text-muted-foreground text-sm">total revenue</span>
				</div>
				<div className="text-right">
					<span className="text-muted-foreground text-sm">Current MRR: </span>
					<span className="font-semibold">{formatCurrency(latestMRR)}</span>
				</div>
			</div>

			<div className="relative h-64">
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
								fill={color}
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

type UsageChartProps = {
	data: Array<{
		date: string;
		activeUsers: number;
		tasksCreated: number;
		aiRequests: number;
	}>;
};

function UsageChart({ data }: UsageChartProps) {
	const totalActiveUsers = data.reduce((a, b) => a + b.activeUsers, 0);
	const totalTasks = data.reduce((a, b) => a + b.tasksCreated, 0);
	const totalAI = data.reduce((a, b) => a + b.aiRequests, 0);

	const maxUsers = Math.max(...data.map((d) => d.activeUsers), 1);
	const maxTasks = Math.max(...data.map((d) => d.tasksCreated), 1);
	const maxAI = Math.max(...data.map((d) => d.aiRequests), 1);
	const maxValue = Math.max(maxUsers, maxTasks, maxAI, 1);

	const chartWidth = 100;
	const chartHeight = 50;
	const padding = 2;

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	};

	// Create line path for each metric
	const createLinePath = (getValue: (d: typeof data[0]) => number) => {
		const points = data.map((d, index) => {
			const x =
				padding + (index / (data.length - 1 || 1)) * (chartWidth - 2 * padding);
			const y =
				chartHeight - padding - (getValue(d) / maxValue) * (chartHeight - 2 * padding);
			return { x, y };
		});

		return points
			.map((point, i) =>
				i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
			)
			.join(" ");
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-4">
				<div className="flex items-center gap-2">
					<div className="size-3 rounded-full bg-primary" />
					<span className="text-sm">Active Users: {totalActiveUsers.toLocaleString()}</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="size-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
					<span className="text-sm">Tasks: {totalTasks.toLocaleString()}</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="size-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
					<span className="text-sm">AI Requests: {totalAI.toLocaleString()}</span>
				</div>
			</div>

			<div className="relative h-64">
				<svg
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					className="h-full w-full"
					preserveAspectRatio="none"
				>
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

					{/* Active Users line */}
					<path
						d={createLinePath((d) => d.activeUsers)}
						fill="none"
						stroke="hsl(var(--primary))"
						strokeWidth="0.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>

					{/* Tasks line */}
					<path
						d={createLinePath((d) => d.tasksCreated)}
						fill="none"
						stroke="hsl(var(--chart-2))"
						strokeWidth="0.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>

					{/* AI Requests line */}
					<path
						d={createLinePath((d) => d.aiRequests)}
						fill="none"
						stroke="hsl(var(--chart-3))"
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

function AdminChartsSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-56" />
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex gap-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-8 w-28" />
					<Skeleton className="h-8 w-20" />
				</div>
				<Skeleton className="h-64 w-full" />
			</CardContent>
		</Card>
	);
}
