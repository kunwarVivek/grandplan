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
import { usePlatformStats } from "../hooks/use-admin";

type AdminChartsProps = {
	className?: string;
};

export function AdminCharts({ className }: AdminChartsProps) {
	const { data, isLoading, error } = usePlatformStats();

	if (isLoading) {
		return <AdminChartsSkeleton className={className} />;
	}

	if (error || !data) {
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
				<CardDescription>User growth and revenue trends</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="users">
					<TabsList className="mb-4">
						<TabsTrigger value="users">User Growth</TabsTrigger>
						<TabsTrigger value="revenue">Revenue Growth</TabsTrigger>
					</TabsList>
					<TabsContent value="users">
						<LineChart
							data={data.userGrowth}
							valueKey="count"
							label="Users"
							color="hsl(var(--primary))"
						/>
					</TabsContent>
					<TabsContent value="revenue">
						<LineChart
							data={data.revenueGrowth}
							valueKey="amount"
							label="Revenue"
							color="hsl(142, 71%, 45%)"
							formatValue={(v) =>
								new Intl.NumberFormat("en-US", {
									style: "currency",
									currency: "USD",
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								}).format(v / 100)
							}
						/>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
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
		return (
			<div className="flex h-64 items-center justify-center text-muted-foreground">
				No data available
			</div>
		);
	}

	const values = data.map((d) => Number(d[valueKey] ?? 0));
	const maxValue = Math.max(...values);
	const minValue = Math.min(...values);
	const range = maxValue - minValue || 1;

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
				<span className="font-bold text-3xl">{formatValue(currentValue)}</span>
				<span
					className={cn(
						"font-medium text-sm",
						change >= 0 ? "text-emerald-500" : "text-red-500",
					)}
				>
					{change >= 0 ? "+" : ""}
					{change.toFixed(1)}%
				</span>
				<span className="text-muted-foreground text-sm">vs previous</span>
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
				</div>
				<Skeleton className="h-64 w-full" />
			</CardContent>
		</Card>
	);
}
