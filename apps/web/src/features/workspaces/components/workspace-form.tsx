import { useForm } from "@tanstack/react-form";
import { FolderKanban, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormFieldWrapper,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
	CreateWorkspaceInput,
	UpdateWorkspaceInput,
	Workspace,
} from "../types";
import { WORKSPACE_COLORS } from "../types";

const formSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	slug: z
		.string()
		.regex(
			/^[a-z0-9-]*$/,
			"Slug can only contain lowercase letters, numbers, and hyphens",
		)
		.refine((val) => val === "" || val.length >= 2, {
			message: "Slug must be at least 2 characters",
		}),
	description: z.string(),
	icon: z.string(),
	color: z.string(),
});

type WorkspaceFormProps = {
	workspace?: Workspace;
	organizationId?: string;
	onSubmit: (data: CreateWorkspaceInput | UpdateWorkspaceInput) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
};

export function WorkspaceForm({
	workspace,
	organizationId,
	onSubmit,
	onCancel,
	isSubmitting,
}: WorkspaceFormProps) {
	const form = useForm({
		defaultValues: {
			name: workspace?.name ?? "",
			slug: workspace?.slug ?? "",
			description: workspace?.description ?? "",
			icon: workspace?.icon ?? "",
			color: workspace?.color ?? WORKSPACE_COLORS[0].value,
		},
		onSubmit: async ({ value }) => {
			if (workspace) {
				onSubmit({
					name: value.name,
					slug: value.slug || undefined,
					description: value.description || undefined,
					icon: value.icon || undefined,
					color: value.color || undefined,
				} as UpdateWorkspaceInput);
			} else {
				onSubmit({
					name: value.name,
					slug: value.slug || undefined,
					description: value.description || undefined,
					icon: value.icon || undefined,
					color: value.color || undefined,
					organizationId: organizationId!,
				} as CreateWorkspaceInput);
			}
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
				<form.Subscribe selector={(state) => state.values}>
					{(values) => (
						<div
							className="flex size-16 shrink-0 items-center justify-center"
							style={{
								backgroundColor: values.color ? `${values.color}20` : undefined,
								color: values.color ?? undefined,
							}}
						>
							{values.icon ? (
								<span className="text-2xl">{values.icon}</span>
							) : (
								<FolderKanban className="size-8" />
							)}
						</div>
					)}
				</form.Subscribe>

				<div className="flex-1 space-y-4">
					<form.Field name="icon">
						{(field) => (
							<FormFieldWrapper field={field} label="Icon (emoji)">
								<Input
									placeholder="e.g., or leave empty for default"
									maxLength={2}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</FormFieldWrapper>
						)}
					</form.Field>

					<form.Field name="color">
						{(field) => {
							const hasError = field.state.meta.errors.length > 0;
							return (
								<FormItem hasError={hasError}>
									<FormLabel>Color</FormLabel>
									<FormControl>
										<div className="flex flex-wrap gap-2">
											{WORKSPACE_COLORS.map((color) => (
												<button
													key={color.value}
													type="button"
													className="size-6 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
													style={{ backgroundColor: color.value }}
													onClick={() => field.handleChange(color.value)}
													title={color.name}
												>
													{field.state.value === color.value && (
														<span className="flex items-center justify-center text-white text-xs">
															&#10003;
														</span>
													)}
												</button>
											))}
										</div>
									</FormControl>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							);
						}}
					</form.Field>
				</div>
			</div>

			<form.Field name="name">
				{(field) => (
					<FormFieldWrapper field={field} label="Workspace name">
						<Input
							placeholder="Engineering"
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
						label="URL slug (optional)"
						description="Leave empty to auto-generate from name"
					>
						<Input
							placeholder="engineering"
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
							placeholder="A brief description of this workspace..."
							className="min-h-20 resize-none"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					</FormFieldWrapper>
				)}
			</form.Field>

			<div className="flex justify-end gap-2">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(formIsSubmitting) => (
						<Button type="submit" disabled={isSubmitting || formIsSubmitting}>
							{(isSubmitting || formIsSubmitting) && (
								<Loader2 className="size-4 animate-spin" />
							)}
							{workspace ? "Save changes" : "Create workspace"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
