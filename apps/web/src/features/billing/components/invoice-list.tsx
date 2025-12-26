import { Download, ExternalLink, FileText } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices } from "../hooks/use-billing";
import type { Invoice } from "../types";

const INVOICE_STATUS_CONFIG: Record<Invoice["status"], { label: string; color: string }> = {
	draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
	open: { label: "Open", color: "bg-blue-500/10 text-blue-500" },
	paid: { label: "Paid", color: "bg-emerald-500/10 text-emerald-500" },
	void: { label: "Void", color: "bg-muted text-muted-foreground" },
	uncollectible: { label: "Uncollectible", color: "bg-red-500/10 text-red-500" },
};

type InvoiceListProps = {
	limit?: number;
};

export function InvoiceList({ limit = 10 }: InvoiceListProps) {
	const { data, isLoading, error } = useInvoices({ limit });

	if (isLoading) {
		return <InvoiceListSkeleton />;
	}

	if (error) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>Unable to load invoices. Please try again later.</p>
			</div>
		);
	}

	const invoices = data?.invoices ?? [];

	if (invoices.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<FileText className="mx-auto size-8 mb-2 opacity-50" />
				<p>No invoices yet</p>
			</div>
		);
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatAmount = (amount: number, currency: string) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Invoice</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Amount</TableHead>
					<TableHead className="w-[100px]">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => {
					const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];

					return (
						<TableRow key={invoice.id}>
							<TableCell className="font-medium">{invoice.number}</TableCell>
							<TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
							<TableCell>
								<Badge className={statusConfig.color}>{statusConfig.label}</Badge>
							</TableCell>
							<TableCell className="text-right">
								{formatAmount(invoice.amountDue, invoice.currency)}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-1">
									{invoice.hostedInvoiceUrl && (
										<Button
											variant="ghost"
											size="icon-xs"
											render={
												<a
													href={invoice.hostedInvoiceUrl}
													target="_blank"
													rel="noopener noreferrer"
													title="View invoice"
												/>
											}
										>
											<ExternalLink className="size-3" />
										</Button>
									)}
									{invoice.invoicePdfUrl && (
										<Button
											variant="ghost"
											size="icon-xs"
											render={
												<a
													href={invoice.invoicePdfUrl}
													download
													title="Download PDF"
												/>
											}
										>
											<Download className="size-3" />
										</Button>
									)}
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function InvoiceListSkeleton() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Invoice</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Amount</TableHead>
					<TableHead className="w-[100px]">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 5 }).map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<Skeleton className="h-4 w-24" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-20" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-16" />
						</TableCell>
						<TableCell className="text-right">
							<Skeleton className="ml-auto h-4 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-6 w-14" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
