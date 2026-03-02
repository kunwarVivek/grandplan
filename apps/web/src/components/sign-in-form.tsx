import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();
	const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: (context) => {
						if (
							context.data &&
							typeof context.data === "object" &&
							"twoFactorRedirect" in context.data &&
							context.data.twoFactorRedirect
						) {
							setRequiresTwoFactor(true);
							toast.info("Enter your two-factor code to continue");
							return;
						}
						navigate({
							to: "/dashboard",
						});
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	const verifyTotp = async () => {
		if (!twoFactorCode) return;
		setIsVerifyingTwoFactor(true);
		try {
			const result = await authClient.twoFactor.verifyTotp({
				code: twoFactorCode,
				trustDevice: true,
			});
			if (result.error) {
				throw new Error(result.error.message || "Invalid two-factor code");
			}
			toast.success("Two-factor verified");
			navigate({ to: "/dashboard" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Verification failed",
			);
		} finally {
			setIsVerifyingTwoFactor(false);
		}
	};

	const verifyBackupCode = async () => {
		if (!twoFactorCode) return;
		setIsVerifyingTwoFactor(true);
		try {
			const result = await authClient.twoFactor.verifyBackupCode({
				code: twoFactorCode,
				trustDevice: true,
			});
			if (result.error) {
				throw new Error(result.error.message || "Invalid backup code");
			}
			toast.success("Backup code verified");
			navigate({ to: "/dashboard" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Verification failed",
			);
		} finally {
			setIsVerifyingTwoFactor(false);
		}
	};

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Welcome Back</h1>
			{requiresTwoFactor ? (
				<div className="space-y-4">
					<p className="text-center text-muted-foreground text-sm">
						Two-factor verification required to complete sign-in.
					</p>
					<div className="space-y-2">
						<Label htmlFor="two-factor-code">Authentication code</Label>
						<Input
							id="two-factor-code"
							name="two-factor-code"
							value={twoFactorCode}
							onChange={(e) => setTwoFactorCode(e.target.value)}
							placeholder="6-digit code or backup code"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Button
							type="button"
							onClick={verifyTotp}
							disabled={!twoFactorCode || isVerifyingTwoFactor}
						>
							Verify TOTP
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={verifyBackupCode}
							disabled={!twoFactorCode || isVerifyingTwoFactor}
						>
							Use Backup Code
						</Button>
					</div>
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setRequiresTwoFactor(false);
							setTwoFactorCode("");
						}}
					>
						Back to Sign In
					</Button>
				</div>
			) : (
				<>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<div>
							<form.Field name="email">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Email</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>

						<div>
							<form.Field name="password">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Password</Label>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="w-full"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "Submitting..." : "Sign In"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-4 text-center">
						<Button
							variant="link"
							onClick={onSwitchToSignUp}
							className="text-indigo-600 hover:text-indigo-800"
						>
							Need an account? Sign Up
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
