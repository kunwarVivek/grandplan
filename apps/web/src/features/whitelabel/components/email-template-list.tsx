import {
	Mail,
	Pencil,
	Plus,
	ToggleLeft,
	ToggleRight,
	Trash2,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
	useDeleteEmailTemplate,
	useEmailTemplates,
	useUpdateEmailTemplate,
} from "../hooks/use-whitelabel";
import type { EmailTemplate } from "../types";

type EmailTemplateListProps = {
	organizationId: string;
	onEdit?: (template: EmailTemplate) => void;
	onCreate?: () => void;
	className?: string;
};

export function EmailTemplateList({
	organizationId,
	onEdit,
	onCreate,
	className,
}: EmailTemplateListProps) {
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const { data: templates, isLoading } = useEmailTemplates(organizationId);
	const deleteMutation = useDeleteEmailTemplate(organizationId);
	const updateMutation = useUpdateEmailTemplate(organizationId);

	const handleDelete = async () => {
		if (!deleteId) return;
		await deleteMutation.mutateAsync(deleteId);
		setDeleteId(null);
	};

	const handleToggleActive = async (template: EmailTemplate) => {
		await updateMutation.mutateAsync({
			id: template.id,
			data: { isActive: !template.isActive },
		});
	};

	if (isLoading) {
		return <EmailTemplateListSkeleton className={className} />;
	}

	return (
		<>
			<Card className={className}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Mail className="size-5" />
								Email Templates
							</CardTitle>
							<CardDescription>
								Manage your organization's email templates
							</CardDescription>
						</div>
						<Button onClick={onCreate} size="sm">
							<Plus className="mr-2 size-4" />
							New Template
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{!templates || templates.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Mail className="mb-4 size-12 text-muted-foreground/50" />
							<p className="text-muted-foreground">No email templates yet</p>
							<p className="text-muted-foreground/75 text-sm">
								Create your first template to get started
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Subject</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[120px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{templates.map((template) => (
									<TableRow key={template.id}>
										<TableCell className="font-medium">
											{template.name}
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{template.type.replace(/_/g, " ")}
											</Badge>
										</TableCell>
										<TableCell className="max-w-[200px] truncate text-muted-foreground">
											{template.subject}
										</TableCell>
										<TableCell>
											<Badge
												className={cn(
													template.isActive
														? "bg-emerald-500/10 text-emerald-500"
														: "bg-muted text-muted-foreground",
												)}
											>
												{template.isActive ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => handleToggleActive(template)}
												>
													{template.isActive ? (
														<ToggleRight className="size-4" />
													) : (
														<ToggleLeft className="size-4" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => onEdit?.(template)}
												>
													<Pencil className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setDeleteId(template.id)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Template</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this email template? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-500 hover:bg-red-600"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function EmailTemplateListSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-60" />
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-4 w-48 flex-1" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-8 w-24" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
