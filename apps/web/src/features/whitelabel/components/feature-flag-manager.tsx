import { Flag, ToggleLeft, ToggleRight, Info } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OrganizationFeatureFlag } from "../types";
import { useOrganizationFeatureFlags, useToggleFeatureFlag } from "../hooks/use-whitelabel";

type FeatureFlagManagerProps = {
	organizationId: string;
	className?: string;
};

export function FeatureFlagManager({
	organizationId,
	className,
}: FeatureFlagManagerProps) {
	const { data: flags, isLoading } = useOrganizationFeatureFlags(organizationId);
	const toggleMutation = useToggleFeatureFlag(organizationId);

	const handleToggle = async (flag: OrganizationFeatureFlag) => {
		await toggleMutation.mutateAsync({
			flagId: flag.featureFlagId,
			isEnabled: !flag.isEnabled,
		});
	};

	if (isLoading) {
		return <FeatureFlagManagerSkeleton className={className} />;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Flag className="size-5" />
					Feature Flags
				</CardTitle>
				<CardDescription>
					Enable or disable features for your organization
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!flags || flags.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Flag className="size-12 text-muted-foreground/50 mb-4" />
						<p className="text-muted-foreground">No feature flags available</p>
						<p className="text-sm text-muted-foreground/75">
							Contact support to enable feature flags for your organization
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{flags.map((flag) => (
							<div
								key={flag.id}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="flex items-center gap-3">
									<div
										className={cn(
											"size-10 rounded-lg flex items-center justify-center",
											flag.isEnabled ? "bg-emerald-500/10" : "bg-muted"
										)}
									>
										{flag.isEnabled ? (
											<ToggleRight className="size-5 text-emerald-500" />
										) : (
											<ToggleLeft className="size-5 text-muted-foreground" />
										)}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<p className="font-medium">{flag.featureFlag.name}</p>
											{flag.featureFlag.description && (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger>
															<Info className="size-4 text-muted-foreground" />
														</TooltipTrigger>
														<TooltipContent>
															<p className="max-w-xs">{flag.featureFlag.description}</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
										</div>
										<p className="text-sm text-muted-foreground font-mono">
											{flag.featureFlag.key}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Badge
										className={cn(
											flag.isEnabled
												? "bg-emerald-500/10 text-emerald-500"
												: "bg-muted text-muted-foreground"
										)}
									>
										{flag.isEnabled ? "Enabled" : "Disabled"}
									</Badge>
									<Switch
										checked={flag.isEnabled}
										onCheckedChange={() => handleToggle(flag)}
										disabled={toggleMutation.isPending}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function FeatureFlagManagerSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-4 w-56" />
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center justify-between p-4 border rounded-lg">
							<div className="flex items-center gap-3">
								<Skeleton className="size-10 rounded-lg" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-5 w-10" />
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
