import { createFileRoute } from "@tanstack/react-router";
import { CameraIcon } from "lucide-react";
import { useState } from "react";

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

function ProfileSettings() {
	const { session } = Route.useRouteContext();
	const user = session?.user;

	const [name, setName] = useState(user?.name ?? "");
	const [email, setEmail] = useState(user?.email ?? "");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// TODO: Implement profile update
		console.log("Update profile:", { name, email });
	}

	const initials = user?.name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase() ?? "U";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-lg font-medium">Profile</h1>
				<p className="text-sm text-muted-foreground">
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
						<div className="relative group cursor-pointer">
							<Avatar size="lg">
								<AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
								<CameraIcon className="size-5 text-white" />
							</div>
							<input
								type="file"
								accept="image/*"
								className="absolute inset-0 cursor-pointer opacity-0"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										// TODO: Implement avatar upload
										console.log("Upload avatar:", file);
									}
								}}
							/>
						</div>
						<div>
							<p className="text-sm font-medium">{user?.name ?? "User"}</p>
							<p className="text-xs text-muted-foreground">
								JPG, GIF or PNG. Max size 2MB.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
					<CardDescription>
						Update your personal details here.
					</CardDescription>
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
							<Button type="submit">Save Changes</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
