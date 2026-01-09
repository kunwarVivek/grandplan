import { useForm } from "@tanstack/react-form";
import { CalendarIcon, Clock, Flag, Loader2, User } from "lucide-react";
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
import type {
	CreateTaskInput,
	Task,
	TaskPriority,
	TaskStatus,
	UpdateTaskInput,
} from "../types";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../types";

const formSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title is too long"),
	description: z.string().max(5000, "Description is too long").optional(),
	status: z.enum([
		"backlog",
		"todo",
		"in_progress",
		"in_review",
		"blocked",
		"completed",
		"cancelled",
	]),
	priority: z.enum(["urgent", "high", "medium", "low"]),
	assigneeId: z.string().optional(),
	startDate: z.string().optional(),
	dueDate: z.string().optional(),
	estimatedHours: z.number().min(0).max(10000).optional(),
	tags: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type TaskFormProps = {
	task?: Task;
	projectId: string;
	parentId?: string;
	assignees?: Array<{ id: string; name: string; avatar?: string | null }>;
	onSubmit: (data: CreateTaskInput | UpdateTaskInput) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
};

function formatDateForInput(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toISOString().split("T")[0];
}

export function TaskForm({
	task,
	projectId,
	parentId,
	assignees = [],
	onSubmit,
	onCancel,
	isSubmitting,
}: TaskFormProps) {
	const form = useForm({
		defaultValues: {
			title: task?.title ?? "",
			description: task?.description ?? "",
			status: task?.status ?? "todo",
			priority: task?.priority ?? "medium",
			assigneeId: task?.assigneeId ?? "",
			startDate: formatDateForInput(task?.startDate),
			dueDate: formatDateForInput(task?.dueDate),
			estimatedHours: task?.estimatedHours ?? undefined,
			tags: task?.tags ?? [],
		} as FormValues,
		onSubmit: async ({ value }) => {
			const baseData = {
				title: value.title,
				description: value.description || undefined,
				status: value.status as TaskStatus,
				priority: value.priority as TaskPriority,
				assigneeId: value.assigneeId || undefined,
				startDate: value.startDate ? new Date(value.startDate) : undefined,
				dueDate: value.dueDate ? new Date(value.dueDate) : undefined,
				estimatedHours: value.estimatedHours,
				tags: value.tags,
			};

			if (task) {
				onSubmit(baseData as UpdateTaskInput);
			} else {
				onSubmit({
					...baseData,
					projectId,
					parentId,
				} as CreateTaskInput);
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
			<form.Field name="title">
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>Task title</FormLabel>
							<FormControl>
								<Input
									placeholder="What needs to be done?"
									autoFocus
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

			<form.Field name="description">
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Add more details about this task..."
									className="min-h-24 resize-none"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</FormControl>
							<FormDescription>Supports markdown formatting</FormDescription>
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
									onValueChange={(v) => field.handleChange(v as TaskStatus)}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												<span
													className={
														TASK_STATUS_CONFIG[field.state.value as TaskStatus]
															?.color
													}
												>
													{
														TASK_STATUS_CONFIG[field.state.value as TaskStatus]
															?.label
													}
												</span>
											</SelectValue>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{Object.entries(TASK_STATUS_CONFIG).map(
											([value, config]) => (
												<SelectItem key={value} value={value}>
													<span className={config.color}>{config.label}</span>
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

				<form.Field name="priority">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Priority</FormLabel>
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as TaskPriority)}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												<span className="flex items-center gap-2">
													<Flag
														className={`size-4 ${
															TASK_PRIORITY_CONFIG[
																field.state.value as TaskPriority
															]?.color
														}`}
													/>
													{
														TASK_PRIORITY_CONFIG[
															field.state.value as TaskPriority
														]?.label
													}
												</span>
											</SelectValue>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{Object.entries(TASK_PRIORITY_CONFIG).map(
											([value, config]) => (
												<SelectItem key={value} value={value}>
													<span className="flex items-center gap-2">
														<Flag className={`size-4 ${config.color}`} />
														{config.label}
													</span>
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

			{assignees.length > 0 && (
				<form.Field name="assigneeId">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Assignee</FormLabel>
								<Select
									value={field.state.value || "unassigned"}
									onValueChange={(v) =>
										field.handleChange(v === "unassigned" || !v ? "" : v)
									}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												<span className="flex items-center gap-2">
													<User className="size-4 text-muted-foreground" />
													{field.state.value
														? (assignees.find((a) => a.id === field.state.value)
																?.name ?? "Unknown")
														: "Unassigned"}
												</span>
											</SelectValue>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="unassigned">
											<span className="flex items-center gap-2 text-muted-foreground">
												<User className="size-4" />
												Unassigned
											</span>
										</SelectItem>
										{assignees.map((assignee) => (
											<SelectItem key={assignee.id} value={assignee.id}>
												<span className="flex items-center gap-2">
													{assignee.avatar ? (
														<img
															src={assignee.avatar}
															alt=""
															className="size-4 rounded-full"
														/>
													) : (
														<User className="size-4" />
													)}
													{assignee.name}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						);
					}}
				</form.Field>
			)}

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

				<form.Field name="dueDate">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<FormItem hasError={hasError}>
								<FormLabel>Due date</FormLabel>
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

			<form.Field name="estimatedHours">
				{(field) => {
					const hasError = field.state.meta.errors.length > 0;
					return (
						<FormItem hasError={hasError}>
							<FormLabel>Estimated hours</FormLabel>
							<FormControl>
								<div className="relative">
									<Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										type="number"
										className="pl-9"
										placeholder="0"
										min={0}
										step={0.5}
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(
												e.target.value
													? Number.parseFloat(e.target.value)
													: undefined,
											)
										}
									/>
								</div>
							</FormControl>
							<FormDescription>
								How long do you estimate this will take?
							</FormDescription>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					);
				}}
			</form.Field>

			<div className="flex justify-end gap-2 pt-4">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(formIsSubmitting) => (
						<Button type="submit" disabled={isSubmitting || formIsSubmitting}>
							{(isSubmitting || formIsSubmitting) && (
								<Loader2 className="mr-2 size-4 animate-spin" />
							)}
							{task ? "Save changes" : "Create task"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
