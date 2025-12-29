import { createFileRoute } from "@tanstack/react-router";
import {
	ComputerIcon,
	KeyIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/security")({
	component: SecuritySettings,
});

interface Session {
	id: string;
	device: string;
	location: string;
	lastActive: string;
	current: boolean;
	type: "desktop" | "mobile";
}

function SecuritySettings() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

	const [sessions] = useState<Session[]>([
		{
			id: "1",
			device: "MacBook Pro",
			location: "San Francisco, CA",
			lastActive: "Just now",
			current: true,
			type: "desktop",
		},
		{
			id: "2",
			device: "iPhone 15 Pro",
			location: "San Francisco, CA",
			lastActive: "2 hours ago",
			current: false,
			type: "mobile",
		},
		{
			id: "3",
			device: "Windows PC",
			location: "New York, NY",
			lastActive: "3 days ago",
			current: false,
			type: "desktop",
		},
	]);

	function handlePasswordChange(e: React.FormEvent) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			// TODO: Show error toast
			console.error("Passwords do not match");
			return;
		}
		// TODO: Implement password change
		console.log("Change password");
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
	}

	function handleRevokeSession(sessionId: string) {
		// TODO: Implement session revocation
		console.log("Revoke session:", sessionId);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-medium text-lg">Security</h1>
				<p className="text-muted-foreground text-sm">
					Manage your account security and active sessions.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyIcon className="size-4" />
						Change Password
					</CardTitle>
					<CardDescription>
						Update your password to keep your account secure.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="current-password">Current Password</Label>
							<Input
								id="current-password"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="Enter current password"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-password">New Password</Label>
							<Input
								id="new-password"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Enter new password"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm New Password</Label>
							<Input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Confirm new password"
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit">Update Password</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ShieldCheckIcon className="size-4" />
						Two-Factor Authentication
					</CardTitle>
					<CardDescription>
						Add an extra layer of security to your account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<p className="font-medium text-sm">
								{twoFactorEnabled ? "Enabled" : "Disabled"}
							</p>
							<p className="text-muted-foreground text-xs">
								{twoFactorEnabled
									? "Your account is protected with two-factor authentication."
									: "Enable two-factor authentication for enhanced security."}
							</p>
						</div>
						<Switch
							checked={twoFactorEnabled}
							onCheckedChange={setTwoFactorEnabled}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Active Sessions</CardTitle>
					<CardDescription>
						Manage devices where you're currently logged in.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{sessions.map((session) => (
						<div
							key={session.id}
							className="flex items-center justify-between gap-4 py-2"
						>
							<div className="flex items-center gap-3">
								{session.type === "desktop" ? (
									<ComputerIcon className="size-5 text-muted-foreground" />
								) : (
									<SmartphoneIcon className="size-5 text-muted-foreground" />
								)}
								<div>
									<div className="flex items-center gap-2">
										<p className="font-medium text-sm">{session.device}</p>
										{session.current && (
											<Badge variant="secondary">Current</Badge>
										)}
									</div>
									<p className="text-muted-foreground text-xs">
										{session.location} - {session.lastActive}
									</p>
								</div>
							</div>
							{!session.current && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleRevokeSession(session.id)}
								>
									Revoke
								</Button>
							)}
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
