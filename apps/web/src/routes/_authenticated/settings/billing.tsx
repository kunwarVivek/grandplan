import { createFileRoute } from "@tanstack/react-router";
import { CreditCardIcon, DownloadIcon } from "lucide-react";

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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	component: BillingSettings,
});

interface Invoice {
	id: string;
	date: string;
	amount: string;
	status: "paid" | "pending" | "failed";
}

function BillingSettings() {
	const invoices: Invoice[] = [
		{ id: "INV-001", date: "Dec 1, 2024", amount: "$29.00", status: "paid" },
		{ id: "INV-002", date: "Nov 1, 2024", amount: "$29.00", status: "paid" },
		{ id: "INV-003", date: "Oct 1, 2024", amount: "$29.00", status: "paid" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-medium text-lg">Billing</h1>
				<p className="text-muted-foreground text-sm">
					Manage your subscription and billing information.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Current Plan</CardTitle>
					<CardDescription>You are currently on the Pro plan.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<div className="flex items-center gap-2">
								<p className="font-semibold text-2xl">Pro</p>
								<Badge>Active</Badge>
							</div>
							<p className="text-muted-foreground text-sm">
								$29/month - Billed monthly
							</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline">Change Plan</Button>
							<Button variant="destructive">Cancel Subscription</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCardIcon className="size-4" />
						Payment Method
					</CardTitle>
					<CardDescription>
						Your current payment method on file.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-md bg-muted">
								<CreditCardIcon className="size-5" />
							</div>
							<div>
								<p className="font-medium text-sm">Visa ending in 4242</p>
								<p className="text-muted-foreground text-xs">Expires 12/2025</p>
							</div>
						</div>
						<Button variant="outline" size="sm">
							Update
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Billing History</CardTitle>
					<CardDescription>
						Download your past invoices and receipts.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Invoice</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoices.map((invoice) => (
								<TableRow key={invoice.id}>
									<TableCell className="font-medium">{invoice.id}</TableCell>
									<TableCell>{invoice.date}</TableCell>
									<TableCell>{invoice.amount}</TableCell>
									<TableCell>
										<Badge
											variant={
												invoice.status === "paid"
													? "default"
													: invoice.status === "pending"
														? "secondary"
														: "destructive"
											}
										>
											{invoice.status}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="icon-sm">
											<DownloadIcon className="size-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
