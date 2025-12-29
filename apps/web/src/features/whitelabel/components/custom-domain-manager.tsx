import {
	AlertCircle,
	CheckCircle2,
	Copy,
	Globe,
	Plus,
	RefreshCw,
	Shield,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	useAddCustomDomain,
	useCustomDomains,
	useRefreshSSL,
	useRemoveCustomDomain,
	useVerifyCustomDomain,
} from "../hooks/use-whitelabel";
import type { CustomDomain, SSLStatus } from "../types";

type CustomDomainManagerProps = {
	organizationId: string;
	className?: string;
};

export function CustomDomainManager({
	organizationId,
	className,
}: CustomDomainManagerProps) {
	const [newDomain, setNewDomain] = useState("");
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const { data: domains, isLoading } = useCustomDomains(organizationId);
	const addMutation = useAddCustomDomain(organizationId);
	const verifyMutation = useVerifyCustomDomain(organizationId);
	const removeMutation = useRemoveCustomDomain(organizationId);
	const refreshSSLMutation = useRefreshSSL(organizationId);

	const handleAddDomain = async () => {
		if (!newDomain) return;
		await addMutation.mutateAsync({ domain: newDomain });
		setNewDomain("");
		setAddDialogOpen(false);
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		await removeMutation.mutateAsync(deleteId);
		setDeleteId(null);
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	const getSSLStatusIcon = (status: SSLStatus) => {
		switch (status) {
			case "ACTIVE":
				return <CheckCircle2 className="size-4 text-emerald-500" />;
			case "PENDING":
				return <AlertCircle className="size-4 text-yellow-500" />;
			case "FAILED":
			case "EXPIRED":
				return <XCircle className="size-4 text-red-500" />;
		}
	};

	const getSSLStatusBadge = (status: SSLStatus) => {
		const styles = {
			ACTIVE: "bg-emerald-500/10 text-emerald-500",
			PENDING: "bg-yellow-500/10 text-yellow-500",
			FAILED: "bg-red-500/10 text-red-500",
			EXPIRED: "bg-red-500/10 text-red-500",
		};
		return <Badge className={styles[status]}>{status}</Badge>;
	};

	if (isLoading) {
		return <CustomDomainManagerSkeleton className={className} />;
	}

	return (
		<>
			<Card className={className}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Globe className="size-5" />
								Custom Domains
							</CardTitle>
							<CardDescription>
								Configure custom domains for white-label branding
							</CardDescription>
						</div>
						<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
							<DialogTrigger render={<Button size="sm" />}>
								<Plus className="mr-2 size-4" />
								Add Domain
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add Custom Domain</DialogTitle>
									<DialogDescription>
										Enter the domain you want to use for your white-label portal
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4 py-4">
									<div className="space-y-2">
										<Label>Domain</Label>
										<Input
											value={newDomain}
											onChange={(e) => setNewDomain(e.target.value)}
											placeholder="app.yourdomain.com"
										/>
									</div>
								</div>
								<DialogFooter>
									<Button
										onClick={handleAddDomain}
										disabled={!newDomain || addMutation.isPending}
									>
										{addMutation.isPending ? "Adding..." : "Add Domain"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					{!domains || domains.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Globe className="mb-4 size-12 text-muted-foreground/50" />
							<p className="text-muted-foreground">
								No custom domains configured
							</p>
							<p className="text-muted-foreground/75 text-sm">
								Add a custom domain to white-label your portal
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{domains.map((domain) => (
								<DomainCard
									key={domain.id}
									domain={domain}
									onVerify={() => verifyMutation.mutateAsync(domain.id)}
									onRefreshSSL={() => refreshSSLMutation.mutateAsync(domain.id)}
									onDelete={() => setDeleteId(domain.id)}
									onCopy={copyToClipboard}
									isVerifying={verifyMutation.isPending}
									isRefreshing={refreshSSLMutation.isPending}
									getSSLStatusIcon={getSSLStatusIcon}
									getSSLStatusBadge={getSSLStatusBadge}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Domain</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove this custom domain? This will
							disable white-label access through this domain.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-500 hover:bg-red-600"
						>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

type DomainCardProps = {
	domain: CustomDomain;
	onVerify: () => void;
	onRefreshSSL: () => void;
	onDelete: () => void;
	onCopy: (text: string) => void;
	isVerifying: boolean;
	isRefreshing: boolean;
	getSSLStatusIcon: (status: SSLStatus) => React.ReactNode;
	getSSLStatusBadge: (status: SSLStatus) => React.ReactNode;
};

function DomainCard({
	domain,
	onVerify,
	onRefreshSSL,
	onDelete,
	onCopy,
	isVerifying,
	isRefreshing,
	getSSLStatusIcon,
	getSSLStatusBadge,
}: DomainCardProps) {
	return (
		<div className="space-y-4 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-lg",
							domain.isVerified ? "bg-emerald-500/10" : "bg-yellow-500/10",
						)}
					>
						{domain.isVerified ? (
							<CheckCircle2 className="size-5 text-emerald-500" />
						) : (
							<AlertCircle className="size-5 text-yellow-500" />
						)}
					</div>
					<div>
						<p className="font-medium">{domain.domain}</p>
						<p className="text-muted-foreground text-sm">
							{domain.isVerified ? "Verified" : "Pending verification"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{domain.isVerified && (
						<div className="flex items-center gap-2">
							{getSSLStatusIcon(domain.sslStatus)}
							{getSSLStatusBadge(domain.sslStatus)}
						</div>
					)}
					<Button variant="ghost" size="icon-sm" onClick={onDelete}>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			{!domain.isVerified && (
				<div className="space-y-3 rounded-lg bg-muted/50 p-4">
					<p className="font-medium text-sm">DNS Verification Required</p>
					<p className="text-muted-foreground text-xs">
						Add the following TXT record to your DNS settings:
					</p>
					<div className="flex items-center gap-2 rounded bg-background p-2">
						<code className="flex-1 truncate font-mono text-xs">
							_grandplan-verify={domain.verificationToken}
						</code>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() =>
								onCopy(`_grandplan-verify=${domain.verificationToken}`)
							}
						>
							<Copy className="size-4" />
						</Button>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onVerify}
						disabled={isVerifying}
					>
						{isVerifying ? "Verifying..." : "Verify Domain"}
					</Button>
				</div>
			)}

			{domain.isVerified && domain.sslStatus !== "ACTIVE" && (
				<div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
					<div className="flex items-center gap-2">
						<Shield className="size-4 text-muted-foreground" />
						<span className="text-sm">SSL Certificate</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onRefreshSSL}
						disabled={isRefreshing}
					>
						<RefreshCw
							className={cn("mr-2 size-4", isRefreshing && "animate-spin")}
						/>
						{isRefreshing ? "Refreshing..." : "Refresh SSL"}
					</Button>
				</div>
			)}
		</div>
	);
}

function CustomDomainManagerSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-60" />
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
