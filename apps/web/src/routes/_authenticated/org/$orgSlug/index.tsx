import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/org/$orgSlug/")({
	component: OrgGeneralSettings,
});

function OrgGeneralSettings() {
	const { orgSlug } = Route.useParams();
	const navigate = useNavigate();

	const [orgName, setOrgName] = useState("My Organization");
	const [slug, setSlug] = useState(orgSlug);
	const [website, setWebsite] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/organizations/${orgSlug}`,
				{
					method: "PATCH",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name: orgName, slug, website }),
				},
			);

			if (!response.ok) throw new Error("Failed to update organization");

			toast.success("Organization updated successfully");
		} catch (error) {
			toast.error("Failed to update organization");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDelete() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/organizations/${orgSlug}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);

			if (!response.ok) throw new Error("Failed to delete organization");

			toast.success("Organization deleted");
			navigate({ to: "/dashboard" });
		} catch (error) {
			toast.error("Failed to delete organization");
		}
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
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="org-slug">Organization Slug</Label>
							<Input
								id="org-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="org-slug"
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
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Saving..." : "Save Changes"}
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
						<AlertDialog>
							<AlertDialogTrigger
								render={
									<Button variant="destructive">Delete Organization</Button>
								}
							/>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Organization</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this organization? This
										action cannot be undone and all data will be permanently
										lost.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										variant="destructive"
										onClick={handleDelete}
									>
										Delete
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
