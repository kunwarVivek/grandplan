import {
	Activity,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Database,
	HardDrive,
	Layers,
	Server,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSystemHealth } from "../hooks/use-admin";
import type { SystemHealth } from "../types";
import { HEALTH_STATUS_CONFIG } from "../types";

type SystemStatusProps = {
	className?: string;
};

export function SystemStatus({ className }: SystemStatusProps) {
	const { data, isLoading, error } = useSystemHealth();

	if (isLoading) {
		return <SystemStatusSkeleton className={className} />;
	}

	if (error || !data) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>System Status</CardTitle>
					<CardDescription>Unable to load system health</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const formatUptime = (seconds: number) => {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		}
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const getOverallStatus = (health: SystemHealth): "healthy" | "degraded" | "down" => {
		const services = [health.database, health.redis, health.queue, health.storage];
		if (services.some((s) => s === "down")) return "down";
		if (services.some((s) => s === "degraded")) return "degraded";
		return "healthy";
	};

	const overallStatus = getOverallStatus(data);

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>System Status</CardTitle>
						<CardDescription>
							Platform health and service status
						</CardDescription>
					</div>
					<OverallStatusBadge status={overallStatus} />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Services Grid */}
				<div className="grid grid-cols-2 gap-4">
					<ServiceCard
						name="Database"
						status={data.database}
						icon={Database}
					/>
					<ServiceCard
						name="Redis"
						status={data.redis}
						icon={Layers}
					/>
					<ServiceCard
						name="Queue"
						status={data.queue}
						icon={Server}
					/>
					<ServiceCard
						name="Storage"
						status={data.storage}
						icon={HardDrive}
					/>
				</div>

				{/* System Info */}
				<div className="border-t pt-4 mt-4">
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="flex items-center gap-2">
							<Activity className="size-4 text-muted-foreground" />
							<span className="text-muted-foreground">Uptime:</span>
							<span className="font-medium">{formatUptime(data.uptime)}</span>
						</div>
						<div className="flex items-center gap-2">
							<Server className="size-4 text-muted-foreground" />
							<span className="text-muted-foreground">Version:</span>
							<span className="font-mono font-medium">{data.version}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

type ServiceCardProps = {
	name: string;
	status: SystemHealth["database"];
	icon: React.ComponentType<{ className?: string }>;
};

function ServiceCard({ name, status, icon: Icon }: ServiceCardProps) {
	const statusConfig = HEALTH_STATUS_CONFIG[status];

	const StatusIcon =
		status === "healthy"
			? CheckCircle2
			: status === "degraded"
				? AlertTriangle
				: XCircle;

	const statusColor =
		status === "healthy"
			? "text-emerald-500"
			: status === "degraded"
				? "text-amber-500"
				: "text-red-500";

	return (
		<div className="flex items-center gap-3 p-3 border rounded-lg">
			<div className={cn("p-2 rounded-lg", statusConfig.color)}>
				<Icon className="size-4" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium">{name}</p>
				<div className="flex items-center gap-1">
					<StatusIcon className={cn("size-3", statusColor)} />
					<span className="text-xs text-muted-foreground">
						{statusConfig.label}
					</span>
				</div>
			</div>
		</div>
	);
}

type OverallStatusBadgeProps = {
	status: "healthy" | "degraded" | "down";
};

function OverallStatusBadge({ status }: OverallStatusBadgeProps) {
	const config = HEALTH_STATUS_CONFIG[status];

	const Icon =
		status === "healthy"
			? CheckCircle2
			: status === "degraded"
				? AlertTriangle
				: XCircle;

	return (
		<Badge className={cn("gap-1", config.color)}>
			<Icon className="size-3" />
			{status === "healthy" ? "All Systems Operational" : config.label}
		</Badge>
	);
}

function SystemStatusSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-48 mt-1" />
					</div>
					<Skeleton className="h-5 w-32" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-3 p-3 border rounded-lg"
						>
							<Skeleton className="size-8 rounded-lg" />
							<div className="flex-1 space-y-1">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-3 w-12" />
							</div>
						</div>
					))}
				</div>
				<div className="border-t pt-4 mt-4">
					<div className="grid grid-cols-2 gap-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
