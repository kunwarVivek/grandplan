import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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

	const [orgName, setOrgName] = useState("My Organization");
	const [slug, setSlug] = useState(orgSlug);
	const [website, setWebsite] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// TODO: Implement org update
		console.log("Update org:", { orgName, slug, website });
	}

	function handleDeleteOrg() {
		// TODO: Implement org deletion with confirmation
		console.log("Delete org:", orgSlug);
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
							<Button type="submit">Save Changes</Button>
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
						<Button variant="destructive" onClick={handleDeleteOrg}>
							Delete Organization
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
