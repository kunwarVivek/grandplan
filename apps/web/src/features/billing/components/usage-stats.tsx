import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUsage } from "../hooks/use-billing";

type UsageStatsProps = {
	className?: string;
};

export function UsageStats({ className }: UsageStatsProps) {
	const { data, isLoading, error } = useUsage();

	if (isLoading) {
		return <UsageStatsSkeleton className={className} />;
	}

	if (error || !data) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Usage</CardTitle>
					<CardDescription>Unable to load usage data</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Current Usage</CardTitle>
				<CardDescription>
					{formatDate(data.currentPeriodStart)} -{" "}
					{formatDate(data.currentPeriodEnd)}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{data.usage.map((metric) => (
					<UsageMeter key={metric.name} metric={metric} />
				))}
			</CardContent>
		</Card>
	);
}

type UsageMeterProps = {
	metric: {
		name: string;
		displayName: string;
		used: number;
		limit: number;
		unit: string;
		percentage: number;
		isOverLimit: boolean;
	};
};

function UsageMeter({ metric }: UsageMeterProps) {
	const isWarning = metric.percentage >= 80 && metric.percentage < 100;
	const isOverLimit = metric.isOverLimit || metric.percentage >= 100;

	const formatValue = (value: number, unit: string) => {
		if (unit === "GB") {
			return `${value.toFixed(1)} GB`;
		}
		if (value >= 1000000) {
			return `${(value / 1000000).toFixed(1)}M`;
		}
		if (value >= 1000) {
			return `${(value / 1000).toFixed(1)}K`;
		}
		return value.toString();
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm">{metric.displayName}</span>
					{isOverLimit && (
						<Badge variant="destructive" className="gap-1">
							<AlertTriangle className="size-3" />
							Over limit
						</Badge>
					)}
					{isWarning && !isOverLimit && (
						<Badge className="bg-amber-500/10 text-amber-500">
							{100 - metric.percentage}% remaining
						</Badge>
					)}
				</div>
				<span className="text-muted-foreground text-sm">
					{formatValue(metric.used, metric.unit)} /{" "}
					{formatValue(metric.limit, metric.unit)}
				</span>
			</div>
			<Progress
				value={Math.min(metric.percentage, 100)}
				className={cn(
					"[&_[data-slot=progress-indicator]]:transition-all",
					isOverLimit && "[&_[data-slot=progress-indicator]]:bg-red-500",
					isWarning &&
						!isOverLimit &&
						"[&_[data-slot=progress-indicator]]:bg-amber-500",
				)}
			>
				<ProgressLabel className="sr-only">{metric.displayName}</ProgressLabel>
				<ProgressValue className="sr-only">
					{() => `${metric.percentage}%`}
				</ProgressValue>
			</Progress>
		</div>
	);
}

function UsageStatsSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-4 w-40" />
			</CardHeader>
			<CardContent className="space-y-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
						</div>
						<Skeleton className="h-1 w-full" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}
