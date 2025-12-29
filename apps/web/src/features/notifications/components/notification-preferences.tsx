import { Bell, Mail, MessageSquare, Save, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	useNotificationPreferences,
	useUpdatePreferences,
} from "../hooks/use-notifications";
import {
	type DigestFrequency,
	NOTIFICATION_CATEGORY_CONFIG,
	NOTIFICATION_CHANNEL_CONFIG,
	type NotificationCategory,
	type NotificationChannel,
} from "../types";

const CHANNEL_ICONS: Record<NotificationChannel, typeof Bell> = {
	in_app: Bell,
	email: Mail,
	push: Smartphone,
	slack: MessageSquare,
};

export function NotificationPreferences() {
	const { data: preferences, isLoading } = useNotificationPreferences();
	const updatePreferences = useUpdatePreferences();

	const [localPreferences, setLocalPreferences] = useState(preferences);
	const [isDirty, setIsDirty] = useState(false);

	// Sync local state when data loads
	if (preferences && !localPreferences) {
		setLocalPreferences(preferences);
	}

	const handleChannelToggle = (
		channel: NotificationChannel,
		enabled: boolean,
	) => {
		if (!localPreferences) return;
		setLocalPreferences({
			...localPreferences,
			channels: {
				...localPreferences.channels,
				[channel]: { enabled },
			},
		});
		setIsDirty(true);
	};

	const handleCategoryToggle = (
		category: NotificationCategory,
		enabled: boolean,
	) => {
		if (!localPreferences) return;
		setLocalPreferences({
			...localPreferences,
			categories: {
				...localPreferences.categories,
				[category]: {
					...localPreferences.categories[category],
					enabled,
				},
			},
		});
		setIsDirty(true);
	};

	const handleCategoryChannelToggle = (
		category: NotificationCategory,
		channel: NotificationChannel,
		enabled: boolean,
	) => {
		if (!localPreferences) return;
		const currentChannels = localPreferences.categories[category].channels;
		const newChannels = enabled
			? [...currentChannels, channel]
			: currentChannels.filter((c) => c !== channel);

		setLocalPreferences({
			...localPreferences,
			categories: {
				...localPreferences.categories,
				[category]: {
					...localPreferences.categories[category],
					channels: newChannels,
				},
			},
		});
		setIsDirty(true);
	};

	const handleQuietHoursToggle = (enabled: boolean) => {
		if (!localPreferences) return;
		setLocalPreferences({
			...localPreferences,
			quietHours: localPreferences.quietHours
				? { ...localPreferences.quietHours, enabled }
				: {
						enabled,
						startTime: "22:00",
						endTime: "08:00",
						timezone: "UTC",
						weekendsOnly: false,
					},
		});
		setIsDirty(true);
	};

	const handleQuietHoursChange = (field: string, value: string | boolean) => {
		if (!localPreferences?.quietHours) return;
		setLocalPreferences({
			...localPreferences,
			quietHours: {
				...localPreferences.quietHours,
				[field]: value,
			},
		});
		setIsDirty(true);
	};

	const handleDigestChange = (frequency: DigestFrequency) => {
		if (!localPreferences) return;
		setLocalPreferences({
			...localPreferences,
			digestFrequency: frequency,
		});
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!localPreferences) return;
		try {
			await updatePreferences.mutateAsync({
				channels: localPreferences.channels,
				categories: localPreferences.categories,
				quietHours: localPreferences.quietHours,
				digestFrequency: localPreferences.digestFrequency,
			});
			setIsDirty(false);
			toast.success("Preferences saved");
		} catch {
			toast.error("Failed to save preferences");
		}
	};

	if (isLoading) {
		return <NotificationPreferencesSkeleton />;
	}

	if (!localPreferences) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Notification Preferences</CardTitle>
					<CardDescription>Unable to load preferences</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Channels */}
			<Card>
				<CardHeader>
					<CardTitle>Notification Channels</CardTitle>
					<CardDescription>
						Choose how you want to receive notifications
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{(
						Object.keys(NOTIFICATION_CHANNEL_CONFIG) as NotificationChannel[]
					).map((channel) => {
						const config = NOTIFICATION_CHANNEL_CONFIG[channel];
						const Icon = CHANNEL_ICONS[channel];
						const isEnabled =
							localPreferences.channels[channel]?.enabled ?? true;

						return (
							<div key={channel} className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Icon className="size-4 text-muted-foreground" />
									<div>
										<Label htmlFor={`channel-${channel}`}>{config.label}</Label>
										<p className="text-muted-foreground text-xs">
											{config.description}
										</p>
									</div>
								</div>
								<Switch
									id={`channel-${channel}`}
									checked={isEnabled}
									onCheckedChange={(checked) =>
										handleChannelToggle(channel, checked)
									}
								/>
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* Categories */}
			<Card>
				<CardHeader>
					<CardTitle>Notification Categories</CardTitle>
					<CardDescription>
						Customize notifications for each category
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{(
						Object.keys(NOTIFICATION_CATEGORY_CONFIG) as NotificationCategory[]
					).map((category) => {
						const config = NOTIFICATION_CATEGORY_CONFIG[category];
						const categoryPrefs = localPreferences.categories[category];
						const isEnabled = categoryPrefs?.enabled ?? true;
						const enabledChannels = categoryPrefs?.channels ?? [];

						return (
							<div key={category} className="space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<Label htmlFor={`category-${category}`}>
											{config.label}
										</Label>
										<p className="text-muted-foreground text-xs">
											{config.description}
										</p>
									</div>
									<Switch
										id={`category-${category}`}
										checked={isEnabled}
										onCheckedChange={(checked) =>
											handleCategoryToggle(category, checked)
										}
									/>
								</div>
								{isEnabled && (
									<div className="ml-4 flex flex-wrap gap-4">
										{(
											Object.keys(
												NOTIFICATION_CHANNEL_CONFIG,
											) as NotificationChannel[]
										).map((channel) => {
											const channelConfig =
												NOTIFICATION_CHANNEL_CONFIG[channel];
											const isChannelEnabled =
												localPreferences.channels[channel]?.enabled ?? true;

											if (!isChannelEnabled) return null;

											return (
												<div key={channel} className="flex items-center gap-2">
													<Checkbox
														id={`${category}-${channel}`}
														checked={enabledChannels.includes(channel)}
														onCheckedChange={(checked) =>
															handleCategoryChannelToggle(
																category,
																channel,
																checked === true,
															)
														}
													/>
													<Label
														htmlFor={`${category}-${channel}`}
														className="font-normal text-xs"
													>
														{channelConfig.label}
													</Label>
												</div>
											);
										})}
									</div>
								)}
								<Separator />
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* Quiet Hours */}
			<Card>
				<CardHeader>
					<CardTitle>Quiet Hours</CardTitle>
					<CardDescription>
						Pause notifications during specific hours
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="quiet-hours">Enable quiet hours</Label>
						<Switch
							id="quiet-hours"
							checked={localPreferences.quietHours?.enabled ?? false}
							onCheckedChange={handleQuietHoursToggle}
						/>
					</div>
					{localPreferences.quietHours?.enabled && (
						<div className="space-y-4 pt-2">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="start-time">Start time</Label>
									<Input
										id="start-time"
										type="time"
										value={localPreferences.quietHours.startTime}
										onChange={(e) =>
											handleQuietHoursChange("startTime", e.target.value)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="end-time">End time</Label>
									<Input
										id="end-time"
										type="time"
										value={localPreferences.quietHours.endTime}
										onChange={(e) =>
											handleQuietHoursChange("endTime", e.target.value)
										}
									/>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id="weekends-only"
									checked={localPreferences.quietHours.weekendsOnly}
									onCheckedChange={(checked) =>
										handleQuietHoursChange("weekendsOnly", checked === true)
									}
								/>
								<Label htmlFor="weekends-only" className="font-normal">
									Weekends only
								</Label>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Email Digest */}
			<Card>
				<CardHeader>
					<CardTitle>Email Digest</CardTitle>
					<CardDescription>
						Receive a summary of your notifications
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<Label htmlFor="digest">Digest frequency</Label>
						<Select
							value={localPreferences.digestFrequency}
							onValueChange={(value) =>
								handleDigestChange(value as DigestFrequency)
							}
						>
							<SelectTrigger className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			{isDirty && (
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={updatePreferences.isPending}>
						<Save className="mr-2 size-4" />
						{updatePreferences.isPending ? "Saving..." : "Save Preferences"}
					</Button>
				</div>
			)}
		</div>
	);
}

function NotificationPreferencesSkeleton() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Skeleton className="size-4" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-3 w-32" />
								</div>
							</div>
							<Skeleton className="h-5 w-9" />
						</div>
					))}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-56" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="space-y-2">
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-5 w-9" />
							</div>
							<Skeleton className="h-px w-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
