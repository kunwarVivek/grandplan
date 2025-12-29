import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	MoreHorizontal,
	RefreshCw,
	Settings,
	Unlink,
} from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	useDisconnectIntegration,
	useRefreshConnection,
	useSyncIntegration,
} from "../hooks/use-integrations";
import {
	INTEGRATION_PROVIDER_CONFIG,
	INTEGRATION_STATUS_CONFIG,
	type IntegrationConnection,
} from "../types";

type IntegrationCardProps = {
	connection: IntegrationConnection;
	onSettings?: () => void;
};

export function IntegrationCard({
	connection,
	onSettings,
}: IntegrationCardProps) {
	const disconnectIntegration = useDisconnectIntegration();
	const syncIntegration = useSyncIntegration();
	const refreshConnection = useRefreshConnection();

	const providerConfig =
		INTEGRATION_PROVIDER_CONFIG[connection.integration.provider];
	const statusConfig = INTEGRATION_STATUS_CONFIG[connection.status];

	const handleSync = () => {
		syncIntegration.mutate({ connectionId: connection.id });
	};

	const handleRefresh = () => {
		refreshConnection.mutate(connection.id);
	};

	const handleDisconnect = () => {
		disconnectIntegration.mutate(connection.id);
	};

	const isConnected = connection.status === "connected";
	const isExpired = connection.status === "expired";
	const hasError = connection.status === "error";

	return (
		<Card className={cn(hasError && "ring-1 ring-red-500/20")}>
			<CardHeader className="flex flex-row items-start justify-between space-y-0">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-lg text-white",
							providerConfig.color,
						)}
					>
						<span className="font-bold text-lg">
							{connection.integration.name.charAt(0)}
						</span>
					</div>
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							{connection.integration.name}
							<Badge className={statusConfig.color}>{statusConfig.label}</Badge>
						</CardTitle>
						<CardDescription className="text-xs">
							{connection.integration.description}
						</CardDescription>
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button variant="ghost" size="icon-sm" />}
					>
						<MoreHorizontal className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{onSettings && (
							<DropdownMenuItem onClick={onSettings}>
								<Settings className="mr-2 size-4" />
								Settings
							</DropdownMenuItem>
						)}
						{isConnected && (
							<DropdownMenuItem
								onClick={handleSync}
								disabled={syncIntegration.isPending}
							>
								<RefreshCw
									className={cn(
										"mr-2 size-4",
										syncIntegration.isPending && "animate-spin",
									)}
								/>
								Sync now
							</DropdownMenuItem>
						)}
						{isExpired && (
							<DropdownMenuItem
								onClick={handleRefresh}
								disabled={refreshConnection.isPending}
							>
								<RefreshCw
									className={cn(
										"mr-2 size-4",
										refreshConnection.isPending && "animate-spin",
									)}
								/>
								Refresh token
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<AlertDialog>
							<AlertDialogTrigger
								render={
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onSelect={(e) => e.preventDefault()}
									/>
								}
							>
								<Unlink className="mr-2 size-4" />
								Disconnect
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Disconnect integration?</AlertDialogTitle>
									<AlertDialogDescription>
										This will disconnect {connection.integration.name} from your
										organization. Any synced data will remain, but automatic
										syncing will stop.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDisconnect}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Disconnect
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>
			<CardContent className="space-y-3">
				{hasError && connection.error && (
					<div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-red-500 text-xs">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<span>{connection.error}</span>
					</div>
				)}

				{isExpired && (
					<div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-500 text-xs">
						<Clock className="mt-0.5 size-4 shrink-0" />
						<span>
							Your authorization has expired. Please refresh the connection to
							continue syncing.
						</span>
					</div>
				)}

				<div className="flex items-center justify-between text-muted-foreground text-xs">
					<div className="flex items-center gap-1">
						{isConnected && (
							<>
								<CheckCircle className="size-3 text-emerald-500" />
								<span>Connected</span>
							</>
						)}
					</div>
					{connection.lastSyncAt && (
						<span>
							Last synced{" "}
							{formatDistanceToNow(new Date(connection.lastSyncAt), {
								addSuffix: true,
							})}
						</span>
					)}
				</div>

				{isConnected && connection.settings?.autoSync && (
					<div className="flex items-center gap-2 text-muted-foreground text-xs">
						<RefreshCw className="size-3" />
						<span>
							Auto-sync every {connection.settings.syncInterval ?? 60} minutes
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
