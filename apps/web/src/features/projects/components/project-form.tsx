import { useForm } from "@tanstack/react-form";
import { CalendarIcon, FolderKanban, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../types";
import {
	PROJECT_COLORS,
	PROJECT_STATUS_CONFIG,
	PROJECT_VISIBILITY_CONFIG,
} from "../types";

const formSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	slug: z
		.string()
		.min(2, "Slug must be at least 2 characters")
		.regex(
			/^[a-z0-9-]+$/,
			"Slug can only contain lowercase letters, numbers, and hyphens",
		)
		.optional()
		.or(z.literal("")),
	description: z.string().optional(),
	status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
	visibility: z.enum(["public", "private", "team"]),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ProjectFormProps = {
	project?: Project;
	workspaceId?: string;
	onSubmit: (data: CreateProjectInput | UpdateProjectInput) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
};

function formatDateForInput(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toISOString().split("T")[0];
}

export function ProjectForm({
	project,
	workspaceId,
	onSubmit,
	onCancel,
	isSubmitting,
}: ProjectFormProps) {
	const form = useForm({
		defaultValues: {
			name: project?.name ?? "",
			slug: project?.slug ?? "",
			description: project?.description ?? "",
			status: project?.status ?? "planning",
			visibility: project?.visibility ?? "public",
			startDate: formatDateForInput(project?.startDate),
			endDate: formatDateForInput(project?.endDate),
			icon: project?.icon ?? "",
			color: project?.color ?? PROJECT_COLORS[0].value,
		} as FormValues,
		onSubmit: async ({ value }) => {
			const baseData = {
				name: value.name,
				slug: value.slug || undefined,
				description: value.description || undefined,
				status: value.status,
				visibility: value.visibility,
				startDate: value.startDate ? new Date(value.startDate) : undefined,
				endDate: value.endDate ? new Date(value.endDate) : undefined,
				icon: value.icon || undefined,
				color: value.color || undefined,
			};

			if (project) {
				onSubmit(baseData as UpdateProjectInput);
			} else {
				onSubmit({
					...baseData,
					workspaceId: workspaceId!,
				} as CreateProjectInput);
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
				<form.Subscribe
					selector={(state) => ({
						color: state.values.color,
						icon: state.values.icon,
					})}
				>
					{({ color, icon }) => (
						<div
							className="flex size-16 shrink-0 items-center justify-center"
							style={{
								backgroundColor: color ? `${color}20` : undefined,
								color: color ?? undefined,
							}}
						>
							{icon ? (
								<span className="text-2xl">{icon}</span>
							) : (
								<FolderKanban className="size-8" />
							)}
						</div>
					)}
				</form.Subscribe>

				<div className="flex-1 space-y-4">
					<form.Field name="icon">
						{(field) => {
							const hasError = field.state.meta.errors.length > 0;
							return (
								<FormItem hasError={hasError}>
									<FormLabel>Icon (emoji)</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., or leave empty"
											maxLength={2}
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</FormControl>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							);
						}}
					</form.Field>

					<form.Field name="color">
						{(field) => {
							const hasError = field.state.meta.errors.length > 0;
							return (
								<FormItem hasError={hasError}>
									<FormLabel>Color</FormLabel>
									<FormControl>
										<div className="flex flex-wrap gap-2">
											{PROJECT_COLORS.map((color) => (
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
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>Project name</FormLabel>
							<FormControl>
								<Input
									placeholder="Website Redesign"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</FormControl>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					);
				}}
			</form.Field>

			<form.Field name="slug">
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>URL slug (optional)</FormLabel>
							<FormControl>
								<Input
									placeholder="website-redesign"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</FormControl>
							<FormDescription>
								Leave empty to auto-generate from name
							</FormDescription>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					);
				}}
			</form.Field>

			<form.Field name="description">
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder="A brief description of this project..."
									className="min-h-20 resize-none"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</FormControl>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					);
				}}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="status">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Status</FormLabel>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(
											v as
												| "planning"
												| "active"
												| "on_hold"
												| "completed"
												| "cancelled",
										)
									}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												{field.state.value
													? PROJECT_STATUS_CONFIG[field.state.value].label
													: "Select status"}
											</SelectValue>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{Object.entries(PROJECT_STATUS_CONFIG).map(
											([value, config]) => (
												<SelectItem key={value} value={value}>
													{config.label}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						);
					}}
				</form.Field>

				<form.Field name="visibility">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Visibility</FormLabel>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "public" | "private" | "team")
									}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												{field.state.value
													? PROJECT_VISIBILITY_CONFIG[field.state.value].label
													: "Select visibility"}
											</SelectValue>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{Object.entries(PROJECT_VISIBILITY_CONFIG).map(
											([value, config]) => (
												<SelectItem key={value} value={value}>
													{config.label}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						);
					}}
				</form.Field>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="startDate">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Start date</FormLabel>
								<FormControl>
									<div className="relative">
										<CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											type="date"
											className="pl-9"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</div>
								</FormControl>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						);
					}}
				</form.Field>

				<form.Field name="endDate">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>End date</FormLabel>
								<FormControl>
									<div className="relative">
										<CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											type="date"
											className="pl-9"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</div>
								</FormControl>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						);
					}}
				</form.Field>
			</div>

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
							{project ? "Save changes" : "Create project"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
