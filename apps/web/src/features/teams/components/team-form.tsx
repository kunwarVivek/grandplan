import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Users2 } from "lucide-react";
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
import type { Team, CreateTeamInput, UpdateTeamInput } from "../types";
import { TEAM_COLORS } from "../types";

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
	icon: z.string().optional(),
	color: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type TeamFormProps = {
	team?: Team;
	organizationId?: string;
	onSubmit: (data: CreateTeamInput | UpdateTeamInput) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
};

export function TeamForm({
	team,
	organizationId,
	onSubmit,
	onCancel,
	isSubmitting,
}: TeamFormProps) {
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: team?.name ?? "",
			slug: team?.slug ?? "",
			description: team?.description ?? "",
			icon: team?.icon ?? "",
			color: team?.color ?? TEAM_COLORS[0].value,
		},
	});

	const handleSubmit = (values: FormValues) => {
		if (team) {
			onSubmit({
				name: values.name,
				slug: values.slug || undefined,
				description: values.description || undefined,
				icon: values.icon || undefined,
				color: values.color || undefined,
			} as UpdateTeamInput);
		} else {
			onSubmit({
				name: values.name,
				slug: values.slug || undefined,
				description: values.description || undefined,
				icon: values.icon || undefined,
				color: values.color || undefined,
				organizationId: organizationId!,
			} as CreateTeamInput);
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
							backgroundColor: selectedColor
								? `${selectedColor}20`
								: undefined,
							color: selectedColor ?? undefined,
						}}
					>
						{iconValue ? (
							<span className="text-2xl">{iconValue}</span>
						) : (
							<Users2 className="size-8" />
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
											placeholder="e.g., or leave empty for default"
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
											{TEAM_COLORS.map((color) => (
												<button
													key={color.value}
													type="button"
													className="size-6 ring-offset-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-110"
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
							<FormLabel>Team name</FormLabel>
							<FormControl>
								<Input placeholder="Engineering" {...field} />
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
								<Input placeholder="engineering" {...field} />
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
									placeholder="A brief description of this team..."
									className="min-h-20 resize-none"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end gap-2">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="size-4 animate-spin" />}
						{team ? "Save changes" : "Create team"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
