import { useForm } from "@tanstack/react-form";
import { Building2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormFieldWrapper } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Organization, UpdateOrganizationInput } from "../types";

const formSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	slug: z
		.string()
		.min(2, "Slug must be at least 2 characters")
		.regex(
			/^[a-z0-9-]+$/,
			"Slug can only contain lowercase letters, numbers, and hyphens",
		),
	description: z.string(),
	logo: z
		.string()
		.refine((val) => val === "" || z.string().url().safeParse(val).success, {
			message: "Must be a valid URL",
		}),
});

type OrgSettingsFormProps = {
	organization?: Organization;
	onSubmit: (data: UpdateOrganizationInput) => void;
	isSubmitting?: boolean;
};

export function OrgSettingsForm({
	organization,
	onSubmit,
	isSubmitting,
}: OrgSettingsFormProps) {
	const form = useForm({
		defaultValues: {
			name: organization?.name ?? "",
			slug: organization?.slug ?? "",
			description: organization?.description ?? "",
			logo: organization?.logo ?? "",
		},
		onSubmit: async ({ value }) => {
			onSubmit({
				name: value.name,
				slug: value.slug,
				description: value.description || undefined,
				logo: value.logo || undefined,
			});
		},
		validators: {
			onSubmit: formSchema,
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<div className="flex items-start gap-6">
				<form.Subscribe selector={(state) => state.values.logo}>
					{(logoValue) => (
						<div className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-muted ring-1 ring-border">
							{logoValue ? (
								<Avatar className="size-full">
									<img
										src={logoValue}
										alt="Organization logo"
										className="object-cover"
									/>
								</Avatar>
							) : (
								<Building2 className="size-8 text-muted-foreground" />
							)}
						</div>
					)}
				</form.Subscribe>

				<form.Field name="logo">
					{(field) => (
						<FormFieldWrapper
							field={field}
							label="Logo URL"
							description="Enter a URL for your organization logo"
							className="flex-1"
						>
							<Input
								placeholder="https://example.com/logo.png"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</FormFieldWrapper>
					)}
				</form.Field>
			</div>

			<form.Field name="name">
				{(field) => (
					<FormFieldWrapper field={field} label="Organization name">
						<Input
							placeholder="Acme Inc."
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					</FormFieldWrapper>
				)}
			</form.Field>

			<form.Field name="slug">
				{(field) => (
					<FormFieldWrapper
						field={field}
						label="URL slug"
						description="This will be used in URLs for your organization"
					>
						<Input
							placeholder="acme-inc"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					</FormFieldWrapper>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<FormFieldWrapper field={field} label="Description">
						<Textarea
							placeholder="A brief description of your organization..."
							className="min-h-20 resize-none"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					</FormFieldWrapper>
				)}
			</form.Field>

			<div className="flex justify-end">
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(formIsSubmitting) => (
						<Button type="submit" disabled={isSubmitting || formIsSubmitting}>
							{(isSubmitting || formIsSubmitting) && (
								<Loader2 className="size-4 animate-spin" />
							)}
							{organization ? "Save changes" : "Create organization"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
