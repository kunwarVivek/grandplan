import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, UploadIcon } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/org/$orgSlug/branding")({
	component: OrgBranding,
});

function OrgBranding() {
	const [primaryColor, setPrimaryColor] = useState("#3b82f6");
	const [secondaryColor, setSecondaryColor] = useState("#64748b");

	function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			// TODO: Implement logo upload
			console.log("Upload logo:", file);
		}
	}

	function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			// TODO: Implement favicon upload
			console.log("Upload favicon:", file);
		}
	}

	function handleSave() {
		// TODO: Implement branding save
		console.log("Save branding:", { primaryColor, secondaryColor });
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Logo</CardTitle>
					<CardDescription>
						Upload your organization's logo. Recommended size: 200x50px.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-6">
						<div className="flex size-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50">
							<ImageIcon className="size-8 text-muted-foreground" />
						</div>
						<div className="space-y-2">
							<div className="relative">
								<Button variant="outline" render={<label className="cursor-pointer" />}>
									<UploadIcon className="size-4" />
									Upload Logo
									<input
										type="file"
										accept="image/*"
										className="sr-only"
										onChange={handleLogoUpload}
									/>
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								PNG, JPG, or SVG. Max size 2MB.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Favicon</CardTitle>
					<CardDescription>
						Upload a favicon for your organization. Recommended size: 32x32px.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-6">
						<div className="flex size-12 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50">
							<ImageIcon className="size-5 text-muted-foreground" />
						</div>
						<div className="space-y-2">
							<div className="relative">
								<Button variant="outline" render={<label className="cursor-pointer" />}>
									<UploadIcon className="size-4" />
									Upload Favicon
									<input
										type="file"
										accept="image/*"
										className="sr-only"
										onChange={handleFaviconUpload}
									/>
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								PNG or ICO. Max size 500KB.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Brand Colors</CardTitle>
					<CardDescription>
						Customize your organization's color scheme.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="primary-color">Primary Color</Label>
							<div className="flex gap-2">
								<Input
									id="primary-color"
									type="color"
									value={primaryColor}
									onChange={(e) => setPrimaryColor(e.target.value)}
									className="size-10 cursor-pointer p-1"
								/>
								<Input
									value={primaryColor}
									onChange={(e) => setPrimaryColor(e.target.value)}
									placeholder="#3b82f6"
									className="flex-1"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="secondary-color">Secondary Color</Label>
							<div className="flex gap-2">
								<Input
									id="secondary-color"
									type="color"
									value={secondaryColor}
									onChange={(e) => setSecondaryColor(e.target.value)}
									className="size-10 cursor-pointer p-1"
								/>
								<Input
									value={secondaryColor}
									onChange={(e) => setSecondaryColor(e.target.value)}
									placeholder="#64748b"
									className="flex-1"
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-end">
						<Button onClick={handleSave}>Save Changes</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Preview</CardTitle>
					<CardDescription>
						See how your branding will look.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border p-6">
						<div className="mb-4 flex items-center gap-3">
							<div
								className="size-8 rounded"
								style={{ backgroundColor: primaryColor }}
							/>
							<span className="font-semibold">Your Organization</span>
						</div>
						<div className="space-y-2">
							<div
								className="h-8 rounded px-3 py-1.5 text-sm text-white"
								style={{ backgroundColor: primaryColor }}
							>
								Primary Button
							</div>
							<div
								className="h-8 rounded px-3 py-1.5 text-sm text-white"
								style={{ backgroundColor: secondaryColor }}
							>
								Secondary Button
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
