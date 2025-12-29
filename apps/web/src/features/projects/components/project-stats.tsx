import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectStats } from "../hooks/use-projects";
import type { ProjectStats as ProjectStatsType } from "../types";

type StatCardProps = {
	title: string;
	value: number;
	icon: React.ReactNode;
	color: string;
	description?: string;
};

function StatCard({ title, value, icon, color, description }: StatCardProps) {
	return (
		<Card size="sm">
			<CardContent className="pt-4">
				<div className="flex items-center gap-3">
					<div
						className="flex size-10 items-center justify-center"
						style={{
							backgroundColor: `${color}20`,
							color,
						}}
					>
						{icon}
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-semibold text-2xl">{value}</p>
						<p className="text-muted-foreground text-xs">{title}</p>
						{description && (
							<p className="mt-0.5 text-muted-foreground text-xs">
								{description}
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function StatsGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{[1, 2, 3, 4].map((i) => (
				<Card key={i} size="sm">
					<CardContent className="pt-4">
						<div className="flex items-center gap-3">
							<Skeleton className="size-10" />
							<div className="flex-1 space-y-1">
								<Skeleton className="h-6 w-12" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

type ProjectStatsDisplayProps = {
	stats: ProjectStatsType;
};

export function ProjectStatsDisplay({ stats }: ProjectStatsDisplayProps) {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Tasks"
					value={stats.totalTasks}
					icon={<Circle className="size-5" />}
					color="#6b7280"
				/>
				<StatCard
					title="In Progress"
					value={stats.inProgressTasks}
					icon={<Clock className="size-5" />}
					color="#f59e0b"
				/>
				<StatCard
					title="Completed"
					value={stats.completedTasks}
					icon={<CheckCircle2 className="size-5" />}
					color="#22c55e"
				/>
				<StatCard
					title="Overdue"
					value={stats.overdueTasks}
					icon={<AlertTriangle className="size-5" />}
					color="#ef4444"
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Overall Progress</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								{stats.completedTasks} of {stats.totalTasks} tasks completed
							</span>
							<span className="font-medium">
								{stats.completionPercentage.toFixed(0)}%
							</span>
						</div>
						<Progress value={stats.completionPercentage} className="h-2" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

type ProjectStatsProps = {
	projectId: string;
};

export function ProjectStats({ projectId }: ProjectStatsProps) {
	const { data: stats, isLoading } = useProjectStats(projectId);

	if (isLoading) {
		return <StatsGridSkeleton />;
	}

	if (!stats) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No stats available
			</div>
		);
	}

	return <ProjectStatsDisplay stats={stats} />;
}
