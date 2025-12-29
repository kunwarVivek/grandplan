import { Filter, Search, Sparkles } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	useAvailableIntegrations,
	useIntegrations,
} from "../hooks/use-integrations";
import {
	INTEGRATION_CATEGORY_CONFIG,
	INTEGRATION_PROVIDER_CONFIG,
	type Integration,
	type IntegrationCategory,
} from "../types";
import { OAuthConnectButton } from "./oauth-connect-button";

type IntegrationGridProps = {
	onConnected?: (connectionId: string) => void;
};

export function IntegrationGrid({ onConnected }: IntegrationGridProps) {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<IntegrationCategory | "all">("all");

	const { data: availableData, isLoading: availableLoading } =
		useAvailableIntegrations(category === "all" ? undefined : category);
	const { data: connectionsData } = useIntegrations();

	const integrations = availableData?.integrations ?? [];
	const connections = connectionsData?.connections ?? [];

	const connectedProviders = new Set(
		connections.map((c) => c.integration.provider),
	);

	const filteredIntegrations = integrations.filter((integration) => {
		if (search) {
			const searchLower = search.toLowerCase();
			return (
				integration.name.toLowerCase().includes(searchLower) ||
				integration.description.toLowerCase().includes(searchLower)
			);
		}
		return true;
	});

	// Group by category
	const groupedIntegrations = filteredIntegrations.reduce(
		(acc, integration) => {
			const cat = integration.category;
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(integration);
			return acc;
		},
		{} as Record<IntegrationCategory, Integration[]>,
	);

	if (availableLoading) {
		return <IntegrationGridSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search integrations..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Filter className="size-4 text-muted-foreground" />
					<Select
						value={category}
						onValueChange={(value) =>
							setCategory(value as IntegrationCategory | "all")
						}
					>
						<SelectTrigger className="w-40">
							<SelectValue>
								{category === "all"
									? "All categories"
									: INTEGRATION_CATEGORY_CONFIG[category].label}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All categories</SelectItem>
							{(
								Object.keys(
									INTEGRATION_CATEGORY_CONFIG,
								) as IntegrationCategory[]
							).map((cat) => (
								<SelectItem key={cat} value={cat}>
									{INTEGRATION_CATEGORY_CONFIG[cat].label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Integration groups */}
			{category === "all" ? (
				Object.entries(groupedIntegrations).map(([cat, items]) => (
					<IntegrationSection
						key={cat}
						category={cat as IntegrationCategory}
						integrations={items}
						connectedProviders={connectedProviders}
						onConnected={onConnected}
					/>
				))
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredIntegrations.map((integration) => (
						<IntegrationItemCard
							key={integration.id}
							integration={integration}
							isConnected={connectedProviders.has(integration.provider)}
							onConnected={onConnected}
						/>
					))}
				</div>
			)}

			{filteredIntegrations.length === 0 && (
				<div className="py-12 text-center">
					<p className="text-muted-foreground">No integrations found</p>
				</div>
			)}
		</div>
	);
}

type IntegrationSectionProps = {
	category: IntegrationCategory;
	integrations: Integration[];
	connectedProviders: Set<string>;
	onConnected?: (connectionId: string) => void;
};

function IntegrationSection({
	category,
	integrations,
	connectedProviders,
	onConnected,
}: IntegrationSectionProps) {
	const config = INTEGRATION_CATEGORY_CONFIG[category];

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-medium text-sm">{config.label}</h3>
				<p className="text-muted-foreground text-xs">{config.description}</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{integrations.map((integration) => (
					<IntegrationItemCard
						key={integration.id}
						integration={integration}
						isConnected={connectedProviders.has(integration.provider)}
						onConnected={onConnected}
					/>
				))}
			</div>
		</div>
	);
}

type IntegrationItemCardProps = {
	integration: Integration;
	isConnected: boolean;
	onConnected?: (connectionId: string) => void;
};

function IntegrationItemCard({
	integration,
	isConnected,
	onConnected,
}: IntegrationItemCardProps) {
	const providerConfig = INTEGRATION_PROVIDER_CONFIG[integration.provider];

	return (
		<Card className={cn(!integration.isAvailable && "opacity-60")}>
			<CardHeader className="flex flex-row items-start gap-3 space-y-0">
				<div
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-lg text-white",
						providerConfig.color,
					)}
				>
					<span className="font-bold text-lg">
						{integration.name.charAt(0)}
					</span>
				</div>
				<div className="min-w-0">
					<CardTitle className="flex items-center gap-2 text-sm">
						{integration.name}
						{integration.isPremium && (
							<Badge variant="secondary" className="gap-1">
								<Sparkles className="size-3" />
								Premium
							</Badge>
						)}
					</CardTitle>
					<CardDescription className="line-clamp-2 text-xs">
						{integration.description}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent>
				<ul className="space-y-1 text-muted-foreground text-xs">
					{integration.features.slice(0, 3).map((feature) => (
						<li key={feature} className="flex items-center gap-1.5">
							<span className="size-1 rounded-full bg-muted-foreground" />
							{feature}
						</li>
					))}
					{integration.features.length > 3 && (
						<li className="text-muted-foreground/70">
							+{integration.features.length - 3} more features
						</li>
					)}
				</ul>
			</CardContent>
			<CardFooter>
				{isConnected ? (
					<Badge className="bg-emerald-500/10 text-emerald-500">
						Connected
					</Badge>
				) : integration.isAvailable ? (
					<OAuthConnectButton
						provider={integration.provider}
						onSuccess={(connectionId) => onConnected?.(connectionId)}
					/>
				) : (
					<Button variant="outline" size="sm" disabled>
						Coming soon
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

function IntegrationGridSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-9 w-full max-w-sm" />
				<Skeleton className="h-9 w-40" />
			</div>
			{Array.from({ length: 2 }).map((_, i) => (
				<div key={i} className="space-y-4">
					<div>
						<Skeleton className="h-4 w-32" />
						<Skeleton className="mt-1 h-3 w-48" />
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, j) => (
							<Card key={j}>
								<CardHeader className="flex flex-row items-start gap-3 space-y-0">
									<Skeleton className="size-10 rounded-lg" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-3 w-full" />
									</div>
								</CardHeader>
								<CardContent className="space-y-2">
									<Skeleton className="h-3 w-full" />
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</CardContent>
								<CardFooter>
									<Skeleton className="h-8 w-20" />
								</CardFooter>
							</Card>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
