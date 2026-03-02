import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ComputerIcon,
	KeyIcon,
	LoaderIcon,
	LogOutIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError, handleApiError } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings/security")({
	component: SecuritySettings,
});

// Types
interface Session {
	id: string;
	token: string;
	userId: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	ipAddress?: string;
	userAgent?: string;
}

interface ChangePasswordInput {
	currentPassword: string;
	newPassword: string;
	revokeOtherSessions?: boolean;
}

interface ChangePasswordResponse {
	token: string | null;
	user: {
		id: string;
		email: string;
		name: string;
		image: string | null;
		emailVerified: boolean;
		createdAt: string;
		updatedAt: string;
	};
}

// Password validation
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
	minLength: PASSWORD_MIN_LENGTH,
	hasUppercase: /[A-Z]/,
	hasLowercase: /[a-z]/,
	hasNumber: /[0-9]/,
	hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

function validatePassword(password: string): {
	isValid: boolean;
	errors: string[];
	strength: "weak" | "fair" | "strong";
} {
	const errors: string[] = [];
	let strengthScore = 0;

	if (password.length < PASSWORD_REQUIREMENTS.minLength) {
		errors.push(
			`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
		);
	} else {
		strengthScore++;
	}

	if (!PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
		errors.push("Password must contain at least one uppercase letter");
	} else {
		strengthScore++;
	}

	if (!PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
		errors.push("Password must contain at least one lowercase letter");
	} else {
		strengthScore++;
	}

	if (!PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
		errors.push("Password must contain at least one number");
	} else {
		strengthScore++;
	}

	if (PASSWORD_REQUIREMENTS.hasSpecial.test(password)) {
		strengthScore++;
	}

	let strength: "weak" | "fair" | "strong" = "weak";
	if (strengthScore >= 4) {
		strength = "strong";
	} else if (strengthScore >= 3) {
		strength = "fair";
	}

	return {
		isValid: errors.length === 0,
		errors,
		strength,
	};
}

// Query keys
const sessionQueryKey = ["auth", "sessions"] as const;

// Hooks
function useSessions() {
	return useQuery({
		queryKey: sessionQueryKey,
		queryFn: async ({ signal }) => {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/list-sessions`,
				{
					method: "GET",
					credentials: "include",
					signal,
				},
			);

			if (!response.ok) {
				throw new ApiError(response.status, response.statusText);
			}

			return response.json() as Promise<Session[]>;
		},
	});
}

function useChangePassword() {
	return useMutation({
		mutationFn: async (
			input: ChangePasswordInput,
		): Promise<ChangePasswordResponse> => {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/change-password`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				},
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new ApiError(response.status, response.statusText, errorData);
			}

			return response.json();
		},
	});
}

function useRevokeSession() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (token: string) => {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/revoke-session`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token }),
				},
			);

			if (!response.ok) {
				throw new ApiError(response.status, response.statusText);
			}

			return response.json() as Promise<{ status: boolean }>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
	});
}

function useRevokeOtherSessions() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/revoke-other-sessions`,
				{
					method: "POST",
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new ApiError(response.status, response.statusText);
			}

			return response.json() as Promise<{ status: boolean }>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
	});
}

// Helper functions
function parseUserAgent(userAgent?: string): {
	device: string;
	type: "desktop" | "mobile" | "tablet";
} {
	if (!userAgent) {
		return { device: "Unknown Device", type: "desktop" };
	}

	const ua = userAgent.toLowerCase();

	// Mobile detection
	if (/iphone/i.test(ua)) {
		return { device: "iPhone", type: "mobile" };
	}
	if (/ipad/i.test(ua)) {
		return { device: "iPad", type: "tablet" };
	}
	if (/android.*mobile/i.test(ua)) {
		return { device: "Android Phone", type: "mobile" };
	}
	if (/android/i.test(ua)) {
		return { device: "Android Tablet", type: "tablet" };
	}

	// Desktop detection
	if (/macintosh|mac os x/i.test(ua)) {
		if (/chrome/i.test(ua)) {
			return { device: "Mac (Chrome)", type: "desktop" };
		}
		if (/safari/i.test(ua)) {
			return { device: "Mac (Safari)", type: "desktop" };
		}
		if (/firefox/i.test(ua)) {
			return { device: "Mac (Firefox)", type: "desktop" };
		}
		return { device: "Mac", type: "desktop" };
	}

	if (/windows/i.test(ua)) {
		if (/chrome/i.test(ua)) {
			return { device: "Windows (Chrome)", type: "desktop" };
		}
		if (/firefox/i.test(ua)) {
			return { device: "Windows (Firefox)", type: "desktop" };
		}
		if (/edge/i.test(ua)) {
			return { device: "Windows (Edge)", type: "desktop" };
		}
		return { device: "Windows PC", type: "desktop" };
	}

	if (/linux/i.test(ua)) {
		return { device: "Linux", type: "desktop" };
	}

	return { device: "Unknown Device", type: "desktop" };
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return "Just now";
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 30) {
		return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
	}

	return date.toLocaleDateString();
}

// Components
function PasswordStrengthIndicator({
	strength,
}: {
	strength: "weak" | "fair" | "strong";
}) {
	const colors = {
		weak: "bg-destructive",
		fair: "bg-yellow-500",
		strong: "bg-green-500",
	};

	const widths = {
		weak: "w-1/3",
		fair: "w-2/3",
		strong: "w-full",
	};

	return (
		<div className="space-y-1">
			<div className="h-1 w-full overflow-hidden bg-muted">
				<div
					className={`h-full transition-all duration-300 ${colors[strength]} ${widths[strength]}`}
				/>
			</div>
			<p className="text-muted-foreground text-xs capitalize">
				Password strength: {strength}
			</p>
		</div>
	);
}

function ChangePasswordCard() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
	const [showValidation, setShowValidation] = useState(false);

	const changePasswordMutation = useChangePassword();
	const queryClient = useQueryClient();

	const validation = validatePassword(newPassword);
	const passwordsMatch = newPassword === confirmPassword;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setShowValidation(true);

		if (!currentPassword) {
			toast.error("Current password is required");
			return;
		}

		if (!validation.isValid) {
			toast.error(validation.errors[0]);
			return;
		}

		if (!passwordsMatch) {
			toast.error("Passwords do not match");
			return;
		}

		try {
			await changePasswordMutation.mutateAsync({
				currentPassword,
				newPassword,
				revokeOtherSessions,
			});

			toast.success("Password changed successfully");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setRevokeOtherSessions(false);
			setShowValidation(false);

			if (revokeOtherSessions) {
				queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			}
		} catch (error) {
			const message = handleApiError(error);
			if (message.toLowerCase().includes("invalid password")) {
				toast.error("Current password is incorrect");
			} else if (message.toLowerCase().includes("too short")) {
				toast.error("New password is too short");
			} else if (message.toLowerCase().includes("too long")) {
				toast.error("New password is too long");
			} else {
				toast.error(message || "Failed to change password");
			}
		}
	}

	return (
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
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="current-password">Current Password</Label>
						<Input
							id="current-password"
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							placeholder="Enter current password"
							autoComplete="current-password"
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
							autoComplete="new-password"
							aria-invalid={showValidation && !validation.isValid}
						/>
						{newPassword && (
							<PasswordStrengthIndicator strength={validation.strength} />
						)}
						{showValidation && !validation.isValid && (
							<ul className="mt-2 space-y-1 text-destructive text-xs">
								{validation.errors.map((error) => (
									<li key={error}>{error}</li>
								))}
							</ul>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirm-password">Confirm New Password</Label>
						<Input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Confirm new password"
							autoComplete="new-password"
							aria-invalid={
								showValidation && !passwordsMatch && confirmPassword.length > 0
							}
						/>
						{showValidation &&
							!passwordsMatch &&
							confirmPassword.length > 0 && (
								<p className="text-destructive text-xs">
									Passwords do not match
								</p>
							)}
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="revoke-sessions"
							checked={revokeOtherSessions}
							onCheckedChange={(checked) =>
								setRevokeOtherSessions(checked === true)
							}
						/>
						<Label htmlFor="revoke-sessions" className="cursor-pointer text-sm">
							Sign out of all other devices
						</Label>
					</div>

					<div className="flex justify-end">
						<Button type="submit" disabled={changePasswordMutation.isPending}>
							{changePasswordMutation.isPending ? (
								<>
									<LoaderIcon className="mr-2 size-4 animate-spin" />
									Updating...
								</>
							) : (
								"Update Password"
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function TwoFactorCard() {
	const { data: session, refetch: refetchSession } = authClient.useSession();
	const twoFactorEnabled =
		Boolean(
			(session?.user as { twoFactorEnabled?: boolean } | undefined)
				?.twoFactorEnabled,
		) ?? false;

	const [password, setPassword] = useState("");
	const [disablePassword, setDisablePassword] = useState("");
	const [totpCode, setTotpCode] = useState("");
	const [totpURI, setTotpURI] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[]>([]);

	const enableTwoFactorMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.twoFactor.enable({ password });
			if (res.error) {
				throw new Error(res.error.message || "Failed to enable 2FA");
			}
			return res.data as { totpURI?: string; backupCodes?: string[] } | null;
		},
		onSuccess: (data) => {
			setTotpURI(data?.totpURI ?? null);
			setBackupCodes(data?.backupCodes ?? []);
			toast.success("Two-factor setup started. Verify code to complete.");
		},
		onError: (error) => {
			toast.error(handleApiError(error) || "Failed to enable 2FA");
		},
	});

	const verifyTotpMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.twoFactor.verifyTotp({
				code: totpCode,
				trustDevice: true,
			});
			if (res.error) {
				throw new Error(res.error.message || "Failed to verify code");
			}
			return res.data;
		},
		onSuccess: async () => {
			setTotpCode("");
			setPassword("");
			await refetchSession();
			toast.success("Two-factor authentication enabled");
		},
		onError: (error) => {
			toast.error(handleApiError(error) || "Invalid verification code");
		},
	});

	const disableTwoFactorMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.twoFactor.disable({
				password: disablePassword,
			});
			if (res.error) {
				throw new Error(res.error.message || "Failed to disable 2FA");
			}
			return res.data;
		},
		onSuccess: async () => {
			setDisablePassword("");
			setTotpURI(null);
			setBackupCodes([]);
			await refetchSession();
			toast.success("Two-factor authentication disabled");
		},
		onError: (error) => {
			toast.error(handleApiError(error) || "Failed to disable 2FA");
		},
	});

	const regenerateBackupCodesMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.twoFactor.generateBackupCodes({
				password: disablePassword,
			});
			if (res.error) {
				throw new Error(res.error.message || "Failed to generate backup codes");
			}
			return res.data as { backupCodes?: string[] } | null;
		},
		onSuccess: (data) => {
			setBackupCodes(data?.backupCodes ?? []);
			toast.success("New backup codes generated");
		},
		onError: (error) => {
			toast.error(handleApiError(error) || "Failed to generate backup codes");
		},
	});

	return (
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
						onCheckedChange={() => {}}
						disabled
					/>
				</div>

				{!twoFactorEnabled ? (
					<div className="mt-4 space-y-3">
						<div className="space-y-2">
							<Label htmlFor="two-factor-password">Current password</Label>
							<Input
								id="two-factor-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter password to enable 2FA"
							/>
						</div>
						<Button
							onClick={() => enableTwoFactorMutation.mutate()}
							disabled={!password || enableTwoFactorMutation.isPending}
						>
							{enableTwoFactorMutation.isPending
								? "Setting up..."
								: "Enable Two-Factor"}
						</Button>

						{totpURI && (
							<div className="space-y-2 rounded-md border p-3">
								<p className="font-medium text-sm">Authenticator setup</p>
								<p className="text-muted-foreground text-xs">
									Add this URI to your authenticator app:
								</p>
								<p className="break-all rounded bg-muted p-2 font-mono text-xs">
									{totpURI}
								</p>
								<div className="space-y-2">
									<Label htmlFor="totp-code">Verification code</Label>
									<Input
										id="totp-code"
										value={totpCode}
										onChange={(e) => setTotpCode(e.target.value)}
										placeholder="Enter 6-digit code"
									/>
								</div>
								<Button
									onClick={() => verifyTotpMutation.mutate()}
									disabled={!totpCode || verifyTotpMutation.isPending}
								>
									{verifyTotpMutation.isPending
										? "Verifying..."
										: "Verify & Activate"}
								</Button>
							</div>
						)}
					</div>
				) : (
					<div className="mt-4 space-y-3">
						<div className="space-y-2">
							<Label htmlFor="two-factor-manage-password">
								Password confirmation
							</Label>
							<Input
								id="two-factor-manage-password"
								type="password"
								value={disablePassword}
								onChange={(e) => setDisablePassword(e.target.value)}
								placeholder="Enter password to manage 2FA"
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								onClick={() => regenerateBackupCodesMutation.mutate()}
								disabled={
									!disablePassword || regenerateBackupCodesMutation.isPending
								}
							>
								{regenerateBackupCodesMutation.isPending
									? "Generating..."
									: "Regenerate Backup Codes"}
							</Button>
							<Button
								variant="destructive"
								onClick={() => disableTwoFactorMutation.mutate()}
								disabled={
									!disablePassword || disableTwoFactorMutation.isPending
								}
							>
								{disableTwoFactorMutation.isPending
									? "Disabling..."
									: "Disable 2FA"}
							</Button>
						</div>

						{backupCodes.length > 0 && (
							<div className="rounded-md border p-3">
								<p className="mb-2 font-medium text-sm">Backup codes</p>
								<div className="grid grid-cols-2 gap-2">
									{backupCodes.map((code) => (
										<code
											key={code}
											className="rounded bg-muted px-2 py-1 text-xs"
										>
											{code}
										</code>
									))}
								</div>
								<p className="mt-2 text-muted-foreground text-xs">
									Store these codes safely. Each code can be used once.
								</p>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function SessionItem({
	session,
	isCurrent,
	onRevoke,
	isRevoking,
}: {
	session: Session;
	isCurrent: boolean;
	onRevoke: () => void;
	isRevoking: boolean;
}) {
	const { device, type } = parseUserAgent(session.userAgent);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const DeviceIcon = type === "mobile" ? SmartphoneIcon : ComputerIcon;

	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<div className="flex items-center gap-3">
				<DeviceIcon className="size-5 text-muted-foreground" />
				<div>
					<div className="flex items-center gap-2">
						<p className="font-medium text-sm">{device}</p>
						{isCurrent && <Badge variant="secondary">Current</Badge>}
					</div>
					<p className="text-muted-foreground text-xs">
						{session.ipAddress || "Unknown location"} -{" "}
						{formatRelativeTime(session.updatedAt || session.createdAt)}
					</p>
				</div>
			</div>
			{!isCurrent && (
				<AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<AlertDialogTrigger
						render={
							<Button variant="outline" size="sm" disabled={isRevoking}>
								{isRevoking ? (
									<LoaderIcon className="size-4 animate-spin" />
								) : (
									"Revoke"
								)}
							</Button>
						}
					/>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Revoke Session</AlertDialogTitle>
							<AlertDialogDescription>
								This will sign out the device "{device}". You will need to sign
								in again on that device.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									onRevoke();
									setIsDialogOpen(false);
								}}
								disabled={isRevoking}
							>
								{isRevoking ? "Revoking..." : "Revoke Session"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}

function SessionsCard() {
	const { data: sessions, isLoading, isError, refetch } = useSessions();
	const revokeSessionMutation = useRevokeSession();
	const revokeOtherSessionsMutation = useRevokeOtherSessions();
	const [revokingToken, setRevokingToken] = useState<string | null>(null);
	const [isRevokeAllDialogOpen, setIsRevokeAllDialogOpen] = useState(false);

	async function handleRevokeSession(token: string) {
		setRevokingToken(token);
		try {
			await revokeSessionMutation.mutateAsync(token);
			toast.success("Session revoked successfully");
		} catch (error) {
			toast.error(handleApiError(error) || "Failed to revoke session");
		} finally {
			setRevokingToken(null);
		}
	}

	async function handleRevokeAllOtherSessions() {
		try {
			await revokeOtherSessionsMutation.mutateAsync();
			toast.success("All other sessions have been revoked");
			setIsRevokeAllDialogOpen(false);
		} catch (error) {
			toast.error(handleApiError(error) || "Failed to revoke sessions");
		}
	}

	// Sort sessions by updatedAt/createdAt descending (most recent first)
	// The current session is likely the most recently updated one
	const sortedSessions = sessions
		? [...sessions].sort((a, b) => {
				const dateA = new Date(a.updatedAt || a.createdAt).getTime();
				const dateB = new Date(b.updatedAt || b.createdAt).getTime();
				return dateB - dateA;
			})
		: [];

	// Mark the first (most recently active) session as current
	const currentSessionToken = sortedSessions[0]?.token;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Active Sessions</CardTitle>
						<CardDescription>
							Manage devices where you're currently logged in.
						</CardDescription>
					</div>
					{sortedSessions.length > 1 && (
						<AlertDialog
							open={isRevokeAllDialogOpen}
							onOpenChange={setIsRevokeAllDialogOpen}
						>
							<AlertDialogTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										disabled={revokeOtherSessionsMutation.isPending}
									>
										<LogOutIcon className="mr-2 size-4" />
										Sign out all other devices
									</Button>
								}
							/>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Sign Out All Other Devices
									</AlertDialogTitle>
									<AlertDialogDescription>
										This will sign you out of all devices except this one. You
										will need to sign in again on those devices.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleRevokeAllOtherSessions}
										disabled={revokeOtherSessionsMutation.isPending}
									>
										{revokeOtherSessionsMutation.isPending
											? "Signing out..."
											: "Sign Out All"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading && (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3 py-2">
								<Skeleton className="size-5" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
							</div>
						))}
					</div>
				)}

				{isError && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<ShieldAlertIcon className="mb-2 size-8 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">
							Failed to load sessions
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							className="mt-2"
						>
							Try again
						</Button>
					</div>
				)}

				{!isLoading && !isError && sortedSessions.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<ShieldCheckIcon className="mb-2 size-8 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">No active sessions</p>
					</div>
				)}

				{!isLoading &&
					!isError &&
					sortedSessions.map((session) => (
						<SessionItem
							key={session.id}
							session={session}
							isCurrent={session.token === currentSessionToken}
							onRevoke={() => handleRevokeSession(session.token)}
							isRevoking={revokingToken === session.token}
						/>
					))}
			</CardContent>
		</Card>
	);
}

function SecuritySettings() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-medium text-lg">Security</h1>
				<p className="text-muted-foreground text-sm">
					Manage your account security and active sessions.
				</p>
			</div>

			<ChangePasswordCard />
			<TwoFactorCard />
			<SessionsCard />
		</div>
	);
}
