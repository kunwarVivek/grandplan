import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
	component: NotificationSettings,
});

interface NotificationPreference {
	id: string;
	title: string;
	description: string;
	enabled: boolean;
}

function NotificationSettings() {
	const [emailPreferences, setEmailPreferences] = useState<
		NotificationPreference[]
	>([
		{
			id: "marketing",
			title: "Marketing emails",
			description: "Receive emails about new features and updates.",
			enabled: true,
		},
		{
			id: "security",
			title: "Security alerts",
			description: "Get notified about security-related events.",
			enabled: true,
		},
		{
			id: "weekly-digest",
			title: "Weekly digest",
			description: "A weekly summary of your activity.",
			enabled: false,
		},
		{
			id: "mentions",
			title: "Mentions",
			description: "Get notified when someone mentions you.",
			enabled: true,
		},
	]);

	const [pushPreferences, setPushPreferences] = useState<
		NotificationPreference[]
	>([
		{
			id: "push-all",
			title: "All notifications",
			description: "Receive all push notifications.",
			enabled: true,
		},
		{
			id: "push-messages",
			title: "Direct messages",
			description: "Get notified about new direct messages.",
			enabled: true,
		},
		{
			id: "push-tasks",
			title: "Task updates",
			description: "Get notified about task assignments and updates.",
			enabled: true,
		},
		{
			id: "push-comments",
			title: "Comments",
			description: "Get notified when someone comments on your items.",
			enabled: false,
		},
	]);

	function toggleEmailPreference(id: string) {
		setEmailPreferences((prev) =>
			prev.map((pref) =>
				pref.id === id ? { ...pref, enabled: !pref.enabled } : pref,
			),
		);
	}

	function togglePushPreference(id: string) {
		setPushPreferences((prev) =>
			prev.map((pref) =>
				pref.id === id ? { ...pref, enabled: !pref.enabled } : pref,
			),
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-medium text-lg">Notifications</h1>
				<p className="text-muted-foreground text-sm">
					Configure how you receive notifications.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Email Notifications</CardTitle>
					<CardDescription>
						Manage which emails you receive from us.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{emailPreferences.map((pref) => (
						<div
							key={pref.id}
							className="flex items-center justify-between gap-4"
						>
							<div className="space-y-0.5">
								<Label htmlFor={pref.id} className="font-medium text-sm">
									{pref.title}
								</Label>
								<p className="text-muted-foreground text-xs">
									{pref.description}
								</p>
							</div>
							<Switch
								id={pref.id}
								checked={pref.enabled}
								onCheckedChange={() => toggleEmailPreference(pref.id)}
							/>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Push Notifications</CardTitle>
					<CardDescription>
						Configure push notification preferences.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{pushPreferences.map((pref) => (
						<div
							key={pref.id}
							className="flex items-center justify-between gap-4"
						>
							<div className="space-y-0.5">
								<Label htmlFor={pref.id} className="font-medium text-sm">
									{pref.title}
								</Label>
								<p className="text-muted-foreground text-xs">
									{pref.description}
								</p>
							</div>
							<Switch
								id={pref.id}
								checked={pref.enabled}
								onCheckedChange={() => togglePushPreference(pref.id)}
							/>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
