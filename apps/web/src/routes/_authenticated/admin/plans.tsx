import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangleIcon,
	CheckIcon,
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	useCreatePlan,
	useDeletePlan,
	usePlatformPlans,
	useUpdatePlan,
} from "@/features/admin/hooks/use-admin";
import { PLAN_TIER_CONFIG, type PlatformPlan } from "@/features/admin/types";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/admin/plans")({
	component: AdminPlans,
});

type PlanFormData = {
	name: string;
	tier: PlatformPlan["tier"];
	price: string;
	interval: PlatformPlan["interval"];
	features: string;
};

const defaultFormData: PlanFormData = {
	name: "",
	tier: "starter",
	price: "",
	interval: "monthly",
	features: "",
};

function AdminPlans() {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<PlatformPlan | null>(null);
	const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

	// Queries and mutations
	const { data, isLoading, isError, error, refetch } = usePlatformPlans();
	const createPlanMutation = useCreatePlan();
	const updatePlanMutation = useUpdatePlan();
	const deletePlanMutation = useDeletePlan();

	const plans = data?.plans ?? [];

	function handleOpenCreate() {
		setFormData(defaultFormData);
		setIsCreateDialogOpen(true);
	}

	function handleOpenEdit(plan: PlatformPlan) {
		setSelectedPlan(plan);
		setFormData({
			name: plan.name,
			tier: plan.tier,
			price: plan.price.toString(),
			interval: plan.interval,
			features: plan.features.join("\n"),
		});
		setIsEditDialogOpen(true);
	}

	function handleOpenDelete(plan: PlatformPlan) {
		setSelectedPlan(plan);
		setIsDeleteDialogOpen(true);
	}

	async function handleCreatePlan(e: React.FormEvent) {
		e.preventDefault();

		try {
			await createPlanMutation.mutateAsync({
				name: formData.name,
				tier: formData.tier,
				price: Number(formData.price),
				interval: formData.interval,
				features: formData.features.split("\n").filter((f) => f.trim()),
				limits: {},
				isActive: true,
			});
			toast.success("Plan created successfully");
			setIsCreateDialogOpen(false);
			setFormData(defaultFormData);
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleUpdatePlan(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedPlan) return;

		try {
			await updatePlanMutation.mutateAsync({
				planId: selectedPlan.id,
				name: formData.name,
				tier: formData.tier,
				price: Number(formData.price),
				interval: formData.interval,
				features: formData.features.split("\n").filter((f) => f.trim()),
			});
			toast.success("Plan updated successfully");
			setIsEditDialogOpen(false);
			setSelectedPlan(null);
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleTogglePlan(plan: PlatformPlan, isActive: boolean) {
		try {
			await updatePlanMutation.mutateAsync({
				planId: plan.id,
				isActive,
			});
			toast.success(isActive ? "Plan activated" : "Plan deactivated");
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	async function handleDeletePlan() {
		if (!selectedPlan) return;

		try {
			await deletePlanMutation.mutateAsync(selectedPlan.id);
			toast.success("Plan deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedPlan(null);
		} catch (err) {
			toast.error(handleApiError(err));
		}
	}

	function getTierConfig(tier: PlatformPlan["tier"]) {
		return PLAN_TIER_CONFIG[tier] ?? PLAN_TIER_CONFIG.starter;
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-semibold text-2xl">Subscription Plans</h1>
						<p className="text-muted-foreground text-sm">
							Manage subscription plans and pricing.
						</p>
					</div>
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex items-center gap-4 py-3">
									<Skeleton className="h-10 w-32" />
									<Skeleton className="h-6 w-20" />
									<Skeleton className="h-6 w-16" />
									<Skeleton className="h-6 w-24" />
									<Skeleton className="ml-auto h-8 w-20" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl">Subscription Plans</h1>
					<p className="text-muted-foreground text-sm">
						Manage subscription plans and pricing.
					</p>
				</div>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<AlertTriangleIcon className="mb-4 size-12 text-destructive" />
						<h3 className="mb-2 font-medium text-lg">Failed to load plans</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							{handleApiError(error)}
						</p>
						<Button variant="outline" onClick={() => refetch()}>
							<RefreshCwIcon className="mr-2 size-4" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Subscription Plans</h1>
					<p className="text-muted-foreground text-sm">
						Manage subscription plans and pricing.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isLoading}
					>
						<RefreshCwIcon className="mr-2 size-4" />
						Refresh
					</Button>
					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger render={<Button onClick={handleOpenCreate} />}>
							<PlusIcon className="mr-2 size-4" />
							Create Plan
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create New Plan</DialogTitle>
								<DialogDescription>
									Add a new subscription plan to the platform.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreatePlan} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="plan-name">Plan Name</Label>
									<Input
										id="plan-name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Pro"
										required
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="plan-tier">Tier</Label>
										<Select
											value={formData.tier}
											onValueChange={(val) =>
												setFormData({ ...formData, tier: val as PlatformPlan["tier"] })
											}
										>
											<SelectTrigger id="plan-tier">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="free">Free</SelectItem>
												<SelectItem value="starter">Starter</SelectItem>
												<SelectItem value="pro">Pro</SelectItem>
												<SelectItem value="enterprise">Enterprise</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="plan-interval">Interval</Label>
										<Select
											value={formData.interval}
											onValueChange={(val) =>
												setFormData({ ...formData, interval: val as PlatformPlan["interval"] })
											}
										>
											<SelectTrigger id="plan-interval">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="monthly">Monthly</SelectItem>
												<SelectItem value="yearly">Yearly</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="plan-price">Price</Label>
									<Input
										id="plan-price"
										type="number"
										min="0"
										step="0.01"
										value={formData.price}
										onChange={(e) =>
											setFormData({ ...formData, price: e.target.value })
										}
										placeholder="29"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="plan-features">Features (one per line)</Label>
									<Textarea
										id="plan-features"
										value={formData.features}
										onChange={(e) =>
											setFormData({ ...formData, features: e.target.value })
										}
										placeholder={"Unlimited projects\nPriority support\nAdvanced analytics"}
										className="min-h-[100px]"
										required
									/>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCreateDialogOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={createPlanMutation.isPending}>
										{createPlanMutation.isPending && (
											<Loader2Icon className="mr-2 size-4 animate-spin" />
										)}
										Create Plan
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Plans</CardTitle>
					<CardDescription>
						Manage your subscription plans and their features.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{plans.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<p className="mb-2 font-medium text-muted-foreground">
								No plans configured
							</p>
							<p className="text-muted-foreground text-sm">
								Create your first subscription plan to get started.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plan</TableHead>
									<TableHead>Tier</TableHead>
									<TableHead>Price</TableHead>
									<TableHead>Subscribers</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{plans.map((plan) => {
									const tierConfig = getTierConfig(plan.tier);
									return (
										<TableRow key={plan.id}>
											<TableCell>
												<p className="font-medium text-sm">{plan.name}</p>
											</TableCell>
											<TableCell>
												<Badge className={tierConfig.color}>
													{tierConfig.label}
												</Badge>
											</TableCell>
											<TableCell>
												{plan.price === 0 ? (
													"Free"
												) : (
													<span>
														${plan.price}/{plan.interval === "monthly" ? "mo" : "yr"}
													</span>
												)}
											</TableCell>
											<TableCell>
												{plan.subscriberCount.toLocaleString()}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Switch
														checked={plan.isActive}
														onCheckedChange={(checked) =>
															handleTogglePlan(plan, checked)
														}
														size="sm"
														disabled={updatePlanMutation.isPending}
													/>
													<Badge variant={plan.isActive ? "default" : "secondary"}>
														{plan.isActive ? "Active" : "Inactive"}
													</Badge>
												</div>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => handleOpenEdit(plan)}
													>
														<PencilIcon className="size-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => handleOpenDelete(plan)}
														disabled={plan.subscriberCount > 0}
													>
														<TrashIcon className="size-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Plan cards grid */}
			{plans.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{plans.map((plan) => {
						const tierConfig = getTierConfig(plan.tier);
						return (
							<Card key={plan.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">{plan.name}</CardTitle>
										<Badge className={tierConfig.color}>{tierConfig.label}</Badge>
									</div>
									<CardDescription>
										{plan.price === 0 ? (
											"Free forever"
										) : (
											<span>
												${plan.price}/{plan.interval}
											</span>
										)}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="mb-3 text-muted-foreground text-sm">
										{plan.subscriberCount.toLocaleString()} active subscribers
									</p>
									<ul className="space-y-2">
										{plan.features.map((feature) => (
											<li key={feature} className="flex items-center gap-2 text-xs">
												<CheckIcon className="size-3 text-primary" />
												{feature}
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Edit Plan Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Plan</DialogTitle>
						<DialogDescription>
							Update the subscription plan details.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleUpdatePlan} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-plan-name">Plan Name</Label>
							<Input
								id="edit-plan-name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Pro"
								required
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="edit-plan-tier">Tier</Label>
								<Select
									value={formData.tier}
									onValueChange={(val) =>
										setFormData({ ...formData, tier: val as PlatformPlan["tier"] })
									}
								>
									<SelectTrigger id="edit-plan-tier">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="free">Free</SelectItem>
										<SelectItem value="starter">Starter</SelectItem>
										<SelectItem value="pro">Pro</SelectItem>
										<SelectItem value="enterprise">Enterprise</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="edit-plan-interval">Interval</Label>
								<Select
									value={formData.interval}
									onValueChange={(val) =>
										setFormData({ ...formData, interval: val as PlatformPlan["interval"] })
									}
								>
									<SelectTrigger id="edit-plan-interval">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="monthly">Monthly</SelectItem>
										<SelectItem value="yearly">Yearly</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-plan-price">Price</Label>
							<Input
								id="edit-plan-price"
								type="number"
								min="0"
								step="0.01"
								value={formData.price}
								onChange={(e) =>
									setFormData({ ...formData, price: e.target.value })
								}
								placeholder="29"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-plan-features">Features (one per line)</Label>
							<Textarea
								id="edit-plan-features"
								value={formData.features}
								onChange={(e) =>
									setFormData({ ...formData, features: e.target.value })
								}
								placeholder={"Unlimited projects\nPriority support\nAdvanced analytics"}
								className="min-h-[100px]"
								required
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updatePlanMutation.isPending}>
								{updatePlanMutation.isPending && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								Save Changes
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Plan Dialog */}
			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10">
							<TrashIcon className="size-6 text-destructive" />
						</AlertDialogMedia>
						<AlertDialogTitle>Delete Plan</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the "{selectedPlan?.name}" plan?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeletePlan}
							disabled={deletePlanMutation.isPending}
							variant="destructive"
						>
							{deletePlanMutation.isPending && (
								<Loader2Icon className="mr-2 size-4 animate-spin" />
							)}
							Delete Plan
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
