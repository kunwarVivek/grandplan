import { createFileRoute } from "@tanstack/react-router";
import { CameraIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const Route = createFileRoute("/_authenticated/settings/profile")({
	component: ProfileSettings,
});

async function uploadFile(
	file: File,
	type: "avatar" | "logo" | "favicon",
): Promise<string | null> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("type", type);

	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL || ""}/api/uploads`,
			{
				method: "POST",
				credentials: "include",
				body: formData,
			},
		);

		if (!response.ok) throw new Error("Upload failed");

		const data = await response.json();
		return data.url;
	} catch (error) {
		toast.error("Failed to upload file");
		return null;
	}
}

function ProfileSettings() {
	const { session } = Route.useRouteContext();
	const user = session?.user;

	const [name, setName] = useState(user?.name ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [avatarUrl, setAvatarUrl] = useState<string | null>(
		user?.image ?? null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/update-user`,
				{
					method: "PATCH",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, email }),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to update profile");
			}

			toast.success("Profile updated successfully");
		} catch (error) {
			toast.error("Failed to update profile");
		} finally {
			setIsSubmitting(false);
		}
	}

	const initials =
		user?.name
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase() ?? "U";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-medium text-lg">Profile</h1>
				<p className="text-muted-foreground text-sm">
					Manage your personal information and account settings.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Avatar</CardTitle>
					<CardDescription>
						Click the avatar to upload a new profile picture.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4">
						<div className="group relative cursor-pointer">
							<Avatar size="lg">
								<AvatarImage
									src={avatarUrl ?? undefined}
									alt={user?.name ?? "User"}
								/>
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
								<CameraIcon className="size-5 text-white" />
							</div>
							<input
								type="file"
								accept="image/*"
								className="absolute inset-0 cursor-pointer opacity-0"
								onChange={async (e) => {
									const file = e.target.files?.[0];
									if (file) {
										const url = await uploadFile(file, "avatar");
										if (url) {
											setAvatarUrl(url);
											toast.success("Avatar uploaded successfully");
										}
									}
								}}
							/>
						</div>
						<div>
							<p className="font-medium text-sm">{user?.name ?? "User"}</p>
							<p className="text-muted-foreground text-xs">
								JPG, GIF or PNG. Max size 2MB.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
					<CardDescription>Update your personal details here.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="your@email.com"
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting}>
								Save Changes
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
