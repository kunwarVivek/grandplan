import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Clock, Flag, Loader2, User } from "lucide-react";
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
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
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
		},
	});

	const handleSubmit = (values: FormValues) => {
		const baseData = {
			title: values.title,
			description: values.description || undefined,
			status: values.status as TaskStatus,
			priority: values.priority as TaskPriority,
			assigneeId: values.assigneeId || undefined,
			startDate: values.startDate ? new Date(values.startDate) : undefined,
			dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
			estimatedHours: values.estimatedHours,
			tags: values.tags,
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
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Task title</FormLabel>
							<FormControl>
								<Input
									placeholder="What needs to be done?"
									autoFocus
									{...field}
								/>
							</FormControl>
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
									placeholder="Add more details about this task..."
									className="min-h-24 resize-none"
									{...field}
								/>
							</FormControl>
							<FormDescription>Supports markdown formatting</FormDescription>
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
												<span
													className={
														TASK_STATUS_CONFIG[field.value as TaskStatus]?.color
													}
												>
													{TASK_STATUS_CONFIG[field.value as TaskStatus]?.label}
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
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="priority"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Priority</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												<span className="flex items-center gap-2">
													<Flag
														className={`size-4 ${
															TASK_PRIORITY_CONFIG[field.value as TaskPriority]
																?.color
														}`}
													/>
													{
														TASK_PRIORITY_CONFIG[field.value as TaskPriority]
															?.label
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
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{assignees.length > 0 && (
					<FormField
						control={form.control}
						name="assigneeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Assignee</FormLabel>
								<Select
									value={field.value || "unassigned"}
									onValueChange={(v) =>
										field.onChange(v === "unassigned" ? "" : v)
									}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue>
												<span className="flex items-center gap-2">
													<User className="size-4 text-muted-foreground" />
													{field.value
														? (assignees.find((a) => a.id === field.value)
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
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

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
						name="dueDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Due date</FormLabel>
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

				<FormField
					control={form.control}
					name="estimatedHours"
					render={({ field }) => (
						<FormItem>
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
										{...field}
										onChange={(e) =>
											field.onChange(
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
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end gap-2 pt-4">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
						{task ? "Save changes" : "Create task"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
