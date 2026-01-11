import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	LinkIcon,
	Loader2Icon,
	PlugIcon,
	RefreshCwIcon,
	SettingsIcon,
	UnlinkIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	IntegrationCard,
	IntegrationGrid,
	useDisconnectIntegration,
	useIntegrations,
	useRefreshConnection,
	useSyncIntegration,
	useUpdateConnection,
	type IntegrationConnection,
	type IntegrationSettings,
	INTEGRATION_STATUS_CONFIG,
} from "@/features/integrations";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute(
	"/_authenticated/org/$orgSlug/integrations",
)({
	component: OrgIntegrations,
});

function OrgIntegrations() {
	const [activeTab, setActiveTab] = useState<"connected" | "available">(
		"connected",
	);
	const [settingsDialogConnection, setSettingsDialogConnection] =
		useState<IntegrationConnection | null>(null);
	const [disconnectConfirmConnection, setDisconnectConfirmConnection] =
		useState<IntegrationConnection | null>(null);

	// Data fetching
	const {
		data: connectionsData,
		isLoading: isLoadingConnections,
		error: connectionsError,
	} = useIntegrations();

	// Mutations
	const disconnectMutation = useDisconnectIntegration();
	const syncMutation = useSyncIntegration();
	const refreshMutation = useRefreshConnection();
	const updateMutation = useUpdateConnection();

	const connections = connectionsData?.connections ?? [];

	// Group connections by status
	const activeConnections = connections.filter(
		(c) => c.status === "connected",
	);
	const issueConnections = connections.filter(
		(c) => c.status === "expired" || c.status === "error",
	);

	function handleOpenSettings(connection: IntegrationConnection) {
		setSettingsDialogConnection(connection);
	}

	function handleCloseSettings() {
		setSettingsDialogConnection(null);
	}

	async function handleUpdateSettings(settings: IntegrationSettings) {
		if (!settingsDialogConnection) return;

		try {
			await updateMutation.mutateAsync({
				connectionId: settingsDialogConnection.id,
				settings,
			});
			toast.success("Integration settings updated");
			handleCloseSettings();
		} catch (error) {
			toast.error(handleApiError(error));
		}
	}

	function handleDisconnectClick(connection: IntegrationConnection) {
		setDisconnectConfirmConnection(connection);
	}

	async function handleConfirmDisconnect() {
		if (!disconnectConfirmConnection) return;

		try {
			await disconnectMutation.mutateAsync(disconnectConfirmConnection.id);
			toast.success(
				`${disconnectConfirmConnection.integration.name} disconnected`,
			);
			setDisconnectConfirmConnection(null);
		} catch (error) {
			toast.error(handleApiError(error));
		}
	}

	async function handleSync(connection: IntegrationConnection) {
		try {
			await syncMutation.mutateAsync({ connectionId: connection.id });
			toast.success(`Syncing ${connection.integration.name}...`);
		} catch (error) {
			toast.error(handleApiError(error));
		}
	}

	async function handleRefresh(connection: IntegrationConnection) {
		try {
			await refreshMutation.mutateAsync(connection.id);
			toast.success(`${connection.integration.name} token refreshed`);
		} catch (error) {
			toast.error(handleApiError(error));
		}
	}

	function handleNewConnection(_connectionId: string) {
		toast.success("Integration connected successfully");
		// Switch to connected tab to show the new connection
		setActiveTab("connected");
	}

	// Loading state
	if (isLoadingConnections) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="mt-2 h-4 w-64" />
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-40" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (connectionsError) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-destructive">
						Failed to load integrations. Please try again later.
					</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => window.location.reload()}
					>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<PlugIcon className="size-5" />
								Integrations
							</CardTitle>
							<CardDescription>
								Connect third-party services to enhance your workflow.
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="gap-1">
								<CheckCircleIcon className="size-3 text-emerald-500" />
								{activeConnections.length} connected
							</Badge>
							{issueConnections.length > 0 && (
								<Badge variant="outline" className="gap-1 text-amber-500">
									<AlertTriangleIcon className="size-3" />
									{issueConnections.length} need attention
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Integrations Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(val) => setActiveTab(val as "connected" | "available")}
			>
				<TabsList>
					<TabsTrigger value="connected" className="gap-2">
						<LinkIcon className="size-4" />
						Connected ({connections.length})
					</TabsTrigger>
					<TabsTrigger value="available" className="gap-2">
						<PlugIcon className="size-4" />
						Available
					</TabsTrigger>
				</TabsList>

				<TabsContent value="connected" className="mt-6 space-y-6">
					{/* Connections with issues */}
					{issueConnections.length > 0 && (
						<Card className="border-amber-500/50 bg-amber-500/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-amber-500 text-sm">
									<AlertTriangleIcon className="size-4" />
									Needs Attention
								</CardTitle>
								<CardDescription>
									These integrations have issues that need to be resolved.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 md:grid-cols-2">
									{issueConnections.map((connection) => (
										<ConnectionCard
											key={connection.id}
											connection={connection}
											onSettings={() => handleOpenSettings(connection)}
											onSync={() => handleSync(connection)}
											onRefresh={() => handleRefresh(connection)}
											onDisconnect={() => handleDisconnectClick(connection)}
											isSyncing={
												syncMutation.isPending &&
												syncMutation.variables?.connectionId === connection.id
											}
											isRefreshing={
												refreshMutation.isPending &&
												refreshMutation.variables === connection.id
											}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Active connections */}
					{activeConnections.length > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Active Connections</CardTitle>
								<CardDescription>
									Your connected integrations are working properly.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 md:grid-cols-2">
									{activeConnections.map((connection) => (
										<IntegrationCard
											key={connection.id}
											connection={connection}
											onSettings={() => handleOpenSettings(connection)}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					) : connections.length === 0 ? (
						<Card>
							<CardContent className="py-12 text-center">
								<PlugIcon className="mx-auto size-12 text-muted-foreground" />
								<h3 className="mt-4 font-medium">No integrations connected</h3>
								<p className="mt-1 text-muted-foreground text-sm">
									Connect your favorite tools to streamline your workflow.
								</p>
								<Button
									className="mt-4"
									onClick={() => setActiveTab("available")}
								>
									Browse Integrations
								</Button>
							</CardContent>
						</Card>
					) : null}
				</TabsContent>

				<TabsContent value="available" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Available Integrations</CardTitle>
							<CardDescription>
								Connect new services to your organization.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<IntegrationGrid onConnected={handleNewConnection} />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Settings Dialog */}
			<IntegrationSettingsDialog
				connection={settingsDialogConnection}
				isOpen={!!settingsDialogConnection}
				onClose={handleCloseSettings}
				onSave={handleUpdateSettings}
				isSaving={updateMutation.isPending}
			/>

			{/* Disconnect Confirmation Dialog */}
			<AlertDialog
				open={!!disconnectConfirmConnection}
				onOpenChange={(open) => !open && setDisconnectConfirmConnection(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Disconnect Integration</AlertDialogTitle>
						<AlertDialogDescription>
							{disconnectConfirmConnection && (
								<>
									Are you sure you want to disconnect{" "}
									<span className="font-medium text-foreground">
										{disconnectConfirmConnection.integration.name}
									</span>
									? Any synced data will remain, but automatic syncing will
									stop.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={disconnectMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleConfirmDisconnect}
							disabled={disconnectMutation.isPending}
						>
							{disconnectMutation.isPending ? (
								<>
									<Loader2Icon className="size-4 animate-spin" />
									Disconnecting...
								</>
							) : (
								<>
									<UnlinkIcon className="size-4" />
									Disconnect
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

// Connection card for issues section with actions
type ConnectionCardProps = {
	connection: IntegrationConnection;
	onSettings: () => void;
	onSync: () => void;
	onRefresh: () => void;
	onDisconnect: () => void;
	isSyncing?: boolean;
	isRefreshing?: boolean;
};

function ConnectionCard({
	connection,
	onSettings,
	onSync,
	onRefresh,
	onDisconnect,
	isSyncing,
	isRefreshing,
}: ConnectionCardProps) {
	const statusConfig = INTEGRATION_STATUS_CONFIG[connection.status];
	const isExpired = connection.status === "expired";
	const hasError = connection.status === "error";

	return (
		<Card className="border-amber-500/30">
			<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
				<div>
					<CardTitle className="flex items-center gap-2 text-base">
						{connection.integration.name}
						<Badge className={statusConfig.color}>{statusConfig.label}</Badge>
					</CardTitle>
					<CardDescription className="text-xs">
						{connection.integration.description}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{hasError && connection.error && (
					<div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-red-500 text-xs">
						<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
						<span>{connection.error}</span>
					</div>
				)}

				{isExpired && (
					<div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-500 text-xs">
						<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
						<span>
							Your authorization has expired. Please refresh to continue
							syncing.
						</span>
					</div>
				)}

				<div className="flex items-center gap-2">
					{isExpired && (
						<Button
							size="sm"
							onClick={onRefresh}
							disabled={isRefreshing}
							className="gap-1"
						>
							{isRefreshing ? (
								<Loader2Icon className="size-3 animate-spin" />
							) : (
								<RefreshCwIcon className="size-3" />
							)}
							Refresh Token
						</Button>
					)}
					{!isExpired && (
						<Button
							size="sm"
							variant="outline"
							onClick={onSync}
							disabled={isSyncing}
							className="gap-1"
						>
							{isSyncing ? (
								<Loader2Icon className="size-3 animate-spin" />
							) : (
								<RefreshCwIcon className="size-3" />
							)}
							Retry Sync
						</Button>
					)}
					<Button size="sm" variant="ghost" onClick={onSettings}>
						<SettingsIcon className="size-3" />
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={onDisconnect}
						className="text-destructive hover:text-destructive"
					>
						<UnlinkIcon className="size-3" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// Settings dialog component
type IntegrationSettingsDialogProps = {
	connection: IntegrationConnection | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (settings: IntegrationSettings) => void;
	isSaving?: boolean;
};

function IntegrationSettingsDialog({
	connection,
	isOpen,
	onClose,
	onSave,
	isSaving,
}: IntegrationSettingsDialogProps) {
	const [settings, setSettings] = useState<IntegrationSettings>({});

	// Reset settings when connection changes
	useEffect(() => {
		if (connection) {
			setSettings(connection.settings ?? {});
		}
	}, [connection]);

	function handleSave() {
		onSave(settings);
	}

	if (!connection) return null;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<SettingsIcon className="size-5" />
						{connection.integration.name} Settings
					</DialogTitle>
					<DialogDescription>
						Configure how {connection.integration.name} syncs with your
						organization.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Auto Sync Toggle */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="auto-sync">Automatic Sync</Label>
							<p className="text-muted-foreground text-xs">
								Automatically sync data at regular intervals
							</p>
						</div>
						<Switch
							id="auto-sync"
							checked={settings.autoSync ?? false}
							onCheckedChange={(checked) =>
								setSettings((prev) => ({ ...prev, autoSync: checked }))
							}
						/>
					</div>

					{/* Sync Interval */}
					{settings.autoSync && (
						<div className="space-y-2">
							<Label htmlFor="sync-interval">Sync Interval</Label>
							<Select
								value={String(settings.syncInterval ?? 60)}
								onValueChange={(val) => {
									if (val) {
										setSettings((prev) => ({
											...prev,
											syncInterval: Number.parseInt(val, 10),
										}));
									}
								}}
							>
								<SelectTrigger id="sync-interval">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="15">Every 15 minutes</SelectItem>
									<SelectItem value="30">Every 30 minutes</SelectItem>
									<SelectItem value="60">Every hour</SelectItem>
									<SelectItem value="360">Every 6 hours</SelectItem>
									<SelectItem value="1440">Daily</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Sync Direction */}
					<div className="space-y-2">
						<Label htmlFor="sync-direction">Sync Direction</Label>
						<Select
							value={settings.syncDirection ?? "import"}
							onValueChange={(val) => {
								if (val) {
									setSettings((prev) => ({
										...prev,
										syncDirection: val as "import" | "export" | "bidirectional",
									}));
								}
							}}
						>
							<SelectTrigger id="sync-direction">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="import">
									<div className="flex flex-col">
										<span>Import only</span>
										<span className="text-muted-foreground text-xs">
											Sync data from {connection.integration.name} to GrandPlan
										</span>
									</div>
								</SelectItem>
								<SelectItem value="export">
									<div className="flex flex-col">
										<span>Export only</span>
										<span className="text-muted-foreground text-xs">
											Sync data from GrandPlan to {connection.integration.name}
										</span>
									</div>
								</SelectItem>
								<SelectItem value="bidirectional">
									<div className="flex flex-col">
										<span>Bidirectional</span>
										<span className="text-muted-foreground text-xs">
											Sync data in both directions
										</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Webhook Notifications */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="webhook-enabled">Webhook Events</Label>
							<p className="text-muted-foreground text-xs">
								Receive real-time updates via webhooks
							</p>
						</div>
						<Switch
							id="webhook-enabled"
							checked={settings.webhookEnabled ?? false}
							onCheckedChange={(checked) =>
								setSettings((prev) => ({ ...prev, webhookEnabled: checked }))
							}
						/>
					</div>

					{/* Notify on Sync */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="notify-sync">Sync Notifications</Label>
							<p className="text-muted-foreground text-xs">
								Get notified when sync completes or fails
							</p>
						</div>
						<Switch
							id="notify-sync"
							checked={settings.notifyOnSync ?? false}
							onCheckedChange={(checked) =>
								setSettings((prev) => ({ ...prev, notifyOnSync: checked }))
							}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={onClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? (
							<>
								<Loader2Icon className="size-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save Settings"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
