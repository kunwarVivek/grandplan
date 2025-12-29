import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
	Form,
	FormControl,
	FormDescription,
	FormField,
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

type FormValues = z.infer<typeof formSchema>;

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

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			role: "member",
		},
	});

	const handleSubmit = async (values: FormValues) => {
		try {
			await inviteMember.mutateAsync({
				organizationId,
				email: values.email,
				role: values.role as OrganizationRole,
			});
			form.reset();
			setOpen(false);
		} catch {
			// Error is handled by the mutation
		}
	};

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

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email address</FormLabel>
									<FormControl>
										<div className="relative">
											<Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="email"
												placeholder="colleague@example.com"
												className="pl-9"
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger>
												<SelectValue>
													{field.value
														? ORGANIZATION_ROLE_CONFIG[
																field.value as keyof typeof ORGANIZATION_ROLE_CONFIG
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
										{field.value === "admin"
											? ORGANIZATION_ROLE_CONFIG.admin.description
											: ORGANIZATION_ROLE_CONFIG.member.description}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

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
				</Form>
			</DialogContent>
		</Dialog>
	);
}
