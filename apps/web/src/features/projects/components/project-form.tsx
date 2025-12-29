import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, FolderKanban, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
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
		},
	});

	const handleSubmit = (values: FormValues) => {
		const baseData = {
			name: values.name,
			slug: values.slug || undefined,
			description: values.description || undefined,
			status: values.status,
			visibility: values.visibility,
			startDate: values.startDate ? new Date(values.startDate) : undefined,
			endDate: values.endDate ? new Date(values.endDate) : undefined,
			icon: values.icon || undefined,
			color: values.color || undefined,
		};

		if (project) {
			onSubmit(baseData as UpdateProjectInput);
		} else {
			onSubmit({
				...baseData,
				workspaceId: workspaceId!,
			} as CreateProjectInput);
		}
	};

	const selectedColor = form.watch("color");
	const iconValue = form.watch("icon");

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<div className="flex items-start gap-6">
					<div
						className="flex size-16 shrink-0 items-center justify-center"
						style={{
							backgroundColor: selectedColor ? `${selectedColor}20` : undefined,
							color: selectedColor ?? undefined,
						}}
					>
						{iconValue ? (
							<span className="text-2xl">{iconValue}</span>
						) : (
							<FolderKanban className="size-8" />
						)}
					</div>

					<div className="flex-1 space-y-4">
						<FormField
							control={form.control}
							name="icon"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Icon (emoji)</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., or leave empty"
											maxLength={2}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="color"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Color</FormLabel>
									<FormControl>
										<div className="flex flex-wrap gap-2">
											{PROJECT_COLORS.map((color) => (
												<button
													key={color.value}
													type="button"
													className="size-6 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
													style={{ backgroundColor: color.value }}
													onClick={() => field.onChange(color.value)}
													title={color.name}
												>
													{field.value === color.value && (
														<span className="flex items-center justify-center text-white text-xs">
															&#10003;
														</span>
													)}
												</button>
											))}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Project name</FormLabel>
							<FormControl>
								<Input placeholder="Website Redesign" {...field} />
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
							<FormLabel>URL slug (optional)</FormLabel>
							<FormControl>
								<Input placeholder="website-redesign" {...field} />
							</FormControl>
							<FormDescription>
								Leave empty to auto-generate from name
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
									placeholder="A brief description of this project..."
									className="min-h-20 resize-none"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Status</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												{field.value
													? PROJECT_STATUS_CONFIG[field.value].label
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
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="visibility"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Visibility</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												{field.value
													? PROJECT_VISIBILITY_CONFIG[field.value].label
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
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="startDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Start date</FormLabel>
								<FormControl>
									<div className="relative">
										<CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input type="date" className="pl-9" {...field} />
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="endDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>End date</FormLabel>
								<FormControl>
									<div className="relative">
										<CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input type="date" className="pl-9" {...field} />
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="flex justify-end gap-2">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="size-4 animate-spin" />}
						{project ? "Save changes" : "Create project"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
