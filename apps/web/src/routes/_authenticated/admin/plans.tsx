import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

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
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/plans")({
	component: AdminPlans,
});

interface Plan {
	id: string;
	name: string;
	slug: string;
	price: number;
	interval: "month" | "year";
	features: string[];
	isActive: boolean;
	subscribers: number;
}

function AdminPlans() {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newPlan, setNewPlan] = useState({
		name: "",
		slug: "",
		price: "",
		features: "",
	});

	const plans: Plan[] = [
		{
			id: "1",
			name: "Free",
			slug: "free",
			price: 0,
			interval: "month",
			features: ["Up to 5 team members", "10 projects", "1GB storage", "Basic support"],
			isActive: true,
			subscribers: 8432,
		},
		{
			id: "2",
			name: "Pro",
			slug: "pro",
			price: 29,
			interval: "month",
			features: [
				"Up to 20 team members",
				"Unlimited projects",
				"10GB storage",
				"Priority support",
				"Advanced analytics",
			],
			isActive: true,
			subscribers: 1256,
		},
		{
			id: "3",
			name: "Enterprise",
			slug: "enterprise",
			price: 99,
			interval: "month",
			features: [
				"Unlimited team members",
				"Unlimited projects",
				"Unlimited storage",
				"24/7 support",
				"Custom integrations",
				"SLA guarantee",
			],
			isActive: true,
			subscribers: 89,
		},
		{
			id: "4",
			name: "Pro Annual",
			slug: "pro-annual",
			price: 290,
			interval: "year",
			features: [
				"Up to 20 team members",
				"Unlimited projects",
				"10GB storage",
				"Priority support",
				"Advanced analytics",
				"2 months free",
			],
			isActive: true,
			subscribers: 342,
		},
	];

	function handleCreatePlan(e: React.FormEvent) {
		e.preventDefault();
		// TODO: Implement plan creation
		console.log("Create plan:", newPlan);
		setNewPlan({ name: "", slug: "", price: "", features: "" });
		setIsCreateDialogOpen(false);
	}

	function handleEditPlan(planId: string) {
		// TODO: Implement plan editing
		console.log("Edit plan:", planId);
	}

	function handleTogglePlan(planId: string, isActive: boolean) {
		// TODO: Implement plan toggle
		console.log("Toggle plan:", planId, isActive);
	}

	function handleDeletePlan(planId: string) {
		// TODO: Implement plan deletion
		console.log("Delete plan:", planId);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Subscription Plans</h1>
					<p className="text-sm text-muted-foreground">
						Manage subscription plans and pricing.
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger render={<Button />}>
						<PlusIcon className="size-4" />
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
									value={newPlan.name}
									onChange={(e) =>
										setNewPlan({ ...newPlan, name: e.target.value })
									}
									placeholder="Pro"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="plan-slug">Slug</Label>
								<Input
									id="plan-slug"
									value={newPlan.slug}
									onChange={(e) =>
										setNewPlan({ ...newPlan, slug: e.target.value })
									}
									placeholder="pro"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="plan-price">Price (per month)</Label>
								<Input
									id="plan-price"
									type="number"
									value={newPlan.price}
									onChange={(e) =>
										setNewPlan({ ...newPlan, price: e.target.value })
									}
									placeholder="29"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="plan-features">Features (one per line)</Label>
								<textarea
									id="plan-features"
									value={newPlan.features}
									onChange={(e) =>
										setNewPlan({ ...newPlan, features: e.target.value })
									}
									placeholder="Unlimited projects&#10;Priority support&#10;Advanced analytics"
									className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									required
								/>
							</div>
							<DialogFooter>
								<Button type="submit">Create Plan</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Plans</CardTitle>
					<CardDescription>
						Manage your subscription plans and their features.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Plan</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Subscribers</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{plans.map((plan) => (
								<TableRow key={plan.id}>
									<TableCell>
										<div>
											<p className="text-sm font-medium">{plan.name}</p>
											<p className="text-xs text-muted-foreground">
												/{plan.slug}
											</p>
										</div>
									</TableCell>
									<TableCell>
										{plan.price === 0 ? (
											"Free"
										) : (
											<span>
												${plan.price}/{plan.interval === "month" ? "mo" : "yr"}
											</span>
										)}
									</TableCell>
									<TableCell>{plan.subscribers.toLocaleString()}</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Switch
												checked={plan.isActive}
												onCheckedChange={(checked) =>
													handleTogglePlan(plan.id, checked)
												}
												size="sm"
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
												onClick={() => handleEditPlan(plan.id)}
											>
												<PencilIcon className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => handleDeletePlan(plan.id)}
												disabled={plan.subscribers > 0}
											>
												<TrashIcon className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{plans.map((plan) => (
					<Card key={plan.id}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-lg">{plan.name}</CardTitle>
								<Badge variant={plan.isActive ? "default" : "secondary"}>
									{plan.isActive ? "Active" : "Inactive"}
								</Badge>
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
							<p className="mb-3 text-sm text-muted-foreground">
								{plan.subscribers.toLocaleString()} active subscribers
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
				))}
			</div>
		</div>
	);
}
