import { useForm } from "@tanstack/react-form";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	FormControl,
	FormDescription,
	FormFieldWrapper,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useInviteMember } from "../hooks/use-organizations";
import type { OrganizationRole } from "../types";
import { ORGANIZATION_ROLE_CONFIG } from "../types";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	role: z.enum(["admin", "member"]),
});

type InviteDialogProps = {
	organizationId: string;
	organizationName?: string;
	trigger?: React.ReactElement;
};

export function InviteDialog({
	organizationId,
	organizationName,
	trigger,
}: InviteDialogProps) {
	const [open, setOpen] = useState(false);
	const inviteMember = useInviteMember();

	const form = useForm({
		defaultValues: {
			email: "",
			role: "member" as "admin" | "member",
		},
		onSubmit: async ({ value }) => {
			try {
				await inviteMember.mutateAsync({
					organizationId,
					email: value.email,
					role: value.role as OrganizationRole,
				});
				form.reset();
				setOpen(false);
			} catch {
				// Error is handled by the mutation
			}
		},
		validators: {
			onSubmit: formSchema,
		},
	});

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			form.reset();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? (
				<DialogTrigger render={trigger} />
			) : (
				<DialogTrigger render={<Button />}>
					<UserPlus className="size-4" />
					Invite member
				</DialogTrigger>
			)}

			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite team member</DialogTitle>
					<DialogDescription>
						Send an invitation to join{" "}
						{organizationName ? (
							<span className="font-medium">{organizationName}</span>
						) : (
							"this organization"
						)}
						.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="email">
						{(field) => (
							<FormFieldWrapper field={field} label="Email address">
								<div className="relative">
									<Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										type="email"
										placeholder="colleague@example.com"
										className="pl-9"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</div>
							</FormFieldWrapper>
						)}
					</form.Field>

					<form.Field name="role">
						{(field) => {
							const hasError = field.state.meta.errors.length > 0;
							return (
								<FormItem hasError={hasError}>
									<FormLabel>Role</FormLabel>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as "admin" | "member")
										}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue>
													{field.state.value
														? ORGANIZATION_ROLE_CONFIG[
																field.state
																	.value as keyof typeof ORGANIZATION_ROLE_CONFIG
															].label
														: "Select a role"}
												</SelectValue>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="admin">
												<div className="flex flex-col">
													<span>{ORGANIZATION_ROLE_CONFIG.admin.label}</span>
												</div>
											</SelectItem>
											<SelectItem value="member">
												<div className="flex flex-col">
													<span>{ORGANIZATION_ROLE_CONFIG.member.label}</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										{field.state.value === "admin"
											? ORGANIZATION_ROLE_CONFIG.admin.description
											: ORGANIZATION_ROLE_CONFIG.member.description}
									</FormDescription>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							);
						}}
					</form.Field>

					<DialogFooter>
						<DialogClose render={<Button variant="outline" type="button" />}>
							Cancel
						</DialogClose>
						<Button type="submit" disabled={inviteMember.isPending}>
							{inviteMember.isPending && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Send invitation
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
