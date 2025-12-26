import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
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
	description: z.string().optional(),
	logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

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
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: organization?.name ?? "",
			slug: organization?.slug ?? "",
			description: organization?.description ?? "",
			logo: organization?.logo ?? "",
		},
	});

	const handleSubmit = (values: FormValues) => {
		onSubmit({
			name: values.name,
			slug: values.slug,
			description: values.description || undefined,
			logo: values.logo || undefined,
		});
	};

	const logoValue = form.watch("logo");

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<div className="flex items-start gap-6">
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

					<FormField
						control={form.control}
						name="logo"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Logo URL</FormLabel>
								<FormControl>
									<Input placeholder="https://example.com/logo.png" {...field} />
								</FormControl>
								<FormDescription>
									Enter a URL for your organization logo
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Organization name</FormLabel>
							<FormControl>
								<Input placeholder="Acme Inc." {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="slug"
					render={({ field }) => (
						<FormItem>
							<FormLabel>URL slug</FormLabel>
							<FormControl>
								<Input placeholder="acme-inc" {...field} />
							</FormControl>
							<FormDescription>
								This will be used in URLs for your organization
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder="A brief description of your organization..."
									className="min-h-20 resize-none"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="size-4 animate-spin" />}
						{organization ? "Save changes" : "Create organization"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
