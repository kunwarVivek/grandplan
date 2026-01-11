import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderIcon } from "lucide-react";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	useDeleteOrganization,
	useOrganizationBySlug,
	useUpdateOrganization,
} from "@/features/organizations/hooks/use-organizations";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/")({
	component: OrgGeneralSettings,
});

function OrgGeneralSettings() {
	const { orgSlug } = Route.useParams();
	const navigate = useNavigate();

	// Fetch organization data
	const { data: organization, isLoading: isLoadingOrg } =
		useOrganizationBySlug(orgSlug);

	// Form state
	const [orgName, setOrgName] = useState("");
	const [slug, setSlug] = useState("");
	const [website, setWebsite] = useState("");
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// React Query mutations
	const updateMutation = useUpdateOrganization();
	const deleteMutation = useDeleteOrganization();

	// Initialize form values when organization data is loaded
	useEffect(() => {
		if (organization) {
			setOrgName(organization.name);
			setSlug(organization.slug);
			// Website might not be in the type, but we keep it for future use
			setWebsite("");
		}
	}, [organization]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!organization) {
			toast.error("Organization not found");
			return;
		}

		updateMutation.mutate(
			{
				organizationId: organization.id,
				name: orgName,
				slug,
			},
			{
				onSuccess: (updatedOrg) => {
					toast.success("Organization updated successfully");
					// Navigate to new slug if it changed
					if (updatedOrg.slug !== orgSlug) {
						navigate({
							to: "/org/$orgSlug",
							params: { orgSlug: updatedOrg.slug },
							replace: true,
						});
					}
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	async function handleDelete() {
		if (!organization) {
			toast.error("Organization not found");
			return;
		}

		// Verify confirmation text matches
		if (deleteConfirmation !== organization.name) {
			toast.error("Please type the organization name exactly to confirm");
			return;
		}

		deleteMutation.mutate(organization.id, {
			onSuccess: () => {
				toast.success("Organization deleted successfully");
				navigate({ to: "/dashboard" });
			},
			onError: (error) => {
				toast.error(handleApiError(error));
			},
		});
	}

	const isSubmitting = updateMutation.isPending;
	const isDeleting = deleteMutation.isPending;
	const canDelete = deleteConfirmation === organization?.name;

	if (isLoadingOrg) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>General Information</CardTitle>
					<CardDescription>
						Update your organization's basic information.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="org-name">Organization Name</Label>
							<Input
								id="org-name"
								value={orgName}
								onChange={(e) => setOrgName(e.target.value)}
								placeholder="Organization name"
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="org-slug">Organization Slug</Label>
							<Input
								id="org-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="org-slug"
								disabled={isSubmitting}
							/>
							<p className="text-muted-foreground text-xs">
								This is used in URLs and must be unique.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="website">Website</Label>
							<Input
								id="website"
								type="url"
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								placeholder="https://example.com"
								disabled={isSubmitting}
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<LoaderIcon className="size-4 animate-spin" />
										Saving...
									</>
								) : (
									"Save Changes"
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-destructive">Danger Zone</CardTitle>
					<CardDescription>
						Irreversible and destructive actions.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium text-sm">Delete Organization</p>
							<p className="text-muted-foreground text-xs">
								Permanently delete this organization and all its data.
							</p>
						</div>
						<AlertDialog
							open={isDeleteDialogOpen}
							onOpenChange={(open) => {
								setIsDeleteDialogOpen(open);
								if (!open) {
									setDeleteConfirmation("");
								}
							}}
						>
							<AlertDialogTrigger
								render={
									<Button variant="destructive">Delete Organization</Button>
								}
							/>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Organization</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will permanently delete
										the organization{" "}
										<span className="font-semibold text-foreground">
											{organization?.name}
										</span>{" "}
										and all associated data including:
									</AlertDialogDescription>
								</AlertDialogHeader>
								<ul className="ml-4 list-disc space-y-1 text-muted-foreground text-sm">
									<li>All workspaces and projects</li>
									<li>All tasks and their history</li>
									<li>All team members and their access</li>
									<li>All integrations and settings</li>
								</ul>
								<div className="space-y-2 pt-2">
									<Label htmlFor="delete-confirmation">
										Type{" "}
										<span className="font-semibold text-foreground">
											{organization?.name}
										</span>{" "}
										to confirm
									</Label>
									<Input
										id="delete-confirmation"
										value={deleteConfirmation}
										onChange={(e) => setDeleteConfirmation(e.target.value)}
										placeholder={organization?.name}
										disabled={isDeleting}
										autoComplete="off"
									/>
								</div>
								<AlertDialogFooter>
									<AlertDialogCancel disabled={isDeleting}>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										variant="destructive"
										onClick={handleDelete}
										disabled={!canDelete || isDeleting}
									>
										{isDeleting ? (
											<>
												<LoaderIcon className="size-4 animate-spin" />
												Deleting...
											</>
										) : (
											"Delete Organization"
										)}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
