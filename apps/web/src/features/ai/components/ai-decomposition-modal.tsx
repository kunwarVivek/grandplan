"use client";

import {
	AlertCircle,
	Check,
	Clock,
	Flag,
	Loader2,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTask } from "@/features/tasks/hooks/use-tasks";
import { TASK_PRIORITY_CONFIG } from "@/features/tasks/types";
import { cn } from "@/lib/utils";
import { useActiveModal, useModalData, useUIStore } from "@/stores";
import type { SuggestedSubtask } from "../hooks/use-ai";
import {
	useAcceptDecomposition,
	useAIJobStatus,
	useDecomposeTask,
} from "../hooks/use-ai";

type SelectedSubtask = SuggestedSubtask & { selected: boolean };

export function AIDecompositionModal() {
	const activeModal = useActiveModal();
	const modalData = useModalData();
	const closeModal = useUIStore((state) => state.closeModal);

	const isOpen = activeModal === "ai-decompose";
	const taskId = modalData?.taskId as string | undefined;

	const [jobId, setJobId] = useState<string | null>(null);
	const [subtasks, setSubtasks] = useState<SelectedSubtask[]>([]);
	const [hasTriggered, setHasTriggered] = useState(false);

	// Fetch the task details
	const { data: task } = useTask(taskId ?? "");

	// AI mutations and queries
	const decomposeTask = useDecomposeTask();
	const jobStatus = useAIJobStatus(jobId);
	const acceptDecomposition = useAcceptDecomposition();

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setJobId(null);
			setSubtasks([]);
			setHasTriggered(false);
		}
	}, [isOpen]);

	// Handle triggering the decomposition
	const handleTriggerDecompose = useCallback(async () => {
		if (!taskId || hasTriggered) return;

		setHasTriggered(true);
		try {
			const result = await decomposeTask.mutateAsync(taskId);
			setJobId(result.jobId);
		} catch {
			// Error is handled by the mutation
		}
	}, [taskId, hasTriggered, decomposeTask]);

	// Update subtasks when job completes
	useEffect(() => {
		if (jobStatus.data?.status === "completed" && jobStatus.data.result) {
			const suggestedSubtasks = jobStatus.data.result.subtasks.map(
				(subtask) => ({
					...subtask,
					selected: true,
				}),
			);
			setSubtasks(suggestedSubtasks);
		}
	}, [jobStatus.data?.status, jobStatus.data?.result]);

	// Handle toggling a subtask selection
	const handleToggleSubtask = (index: number) => {
		setSubtasks((prev) =>
			prev.map((subtask, i) =>
				i === index ? { ...subtask, selected: !subtask.selected } : subtask,
			),
		);
	};

	// Handle removing a subtask
	const handleRemoveSubtask = (index: number) => {
		setSubtasks((prev) => prev.filter((_, i) => i !== index));
	};

	// Handle accepting selected subtasks
	const handleAccept = async () => {
		if (!taskId || !task) return;

		const selectedSubtasks = subtasks
			.filter((s) => s.selected)
			.map(({ selected: _, ...subtask }) => subtask);

		if (selectedSubtasks.length === 0) {
			closeModal();
			return;
		}

		try {
			await acceptDecomposition.mutateAsync({
				taskId,
				projectId: task.projectId,
				subtasks: selectedSubtasks,
			});
			closeModal();
		} catch {
			// Error is handled by the mutation
		}
	};

	// Handle closing the modal
	const handleOpenChange = (open: boolean) => {
		if (!open) {
			closeModal();
		}
	};

	// Determine current state
	const isPending = decomposeTask.isPending;
	const isProcessing =
		jobStatus.data?.status === "pending" ||
		jobStatus.data?.status === "processing";
	const isCompleted = jobStatus.data?.status === "completed";
	const isFailed =
		decomposeTask.isError || jobStatus.data?.status === "failed";
	const isLoading = isPending || isProcessing;

	const selectedCount = subtasks.filter((s) => s.selected).length;

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="size-5 text-primary" />
						AI Task Decomposition
					</DialogTitle>
					<DialogDescription>
						{task
							? `Break down "${task.title}" into smaller, actionable subtasks using AI.`
							: "Loading task details..."}
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-48 py-4">
					{/* Initial state - show trigger button */}
					{!hasTriggered && !isLoading && !isCompleted && !isFailed && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<div className="rounded-full bg-primary/10 p-4">
								<Sparkles className="size-8 text-primary" />
							</div>
							<p className="text-center text-muted-foreground text-sm">
								AI will analyze this task and suggest subtasks to help you break
								it down into manageable pieces.
							</p>
							<Button onClick={handleTriggerDecompose} disabled={!taskId}>
								<Sparkles className="size-4" />
								Generate Subtasks
							</Button>
						</div>
					)}

					{/* Loading state */}
					{isLoading && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<Loader2 className="size-8 animate-spin text-primary" />
							<p className="text-center text-muted-foreground text-sm">
								{isPending
									? "Starting AI analysis..."
									: "AI is analyzing your task and generating subtasks..."}
							</p>
							<p className="text-center text-muted-foreground/60 text-xs">
								This may take a few seconds
							</p>
						</div>
					)}

					{/* Error state */}
					{isFailed && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<div className="rounded-full bg-destructive/10 p-4">
								<AlertCircle className="size-8 text-destructive" />
							</div>
							<p className="text-center font-medium text-destructive text-sm">
								Failed to generate subtasks
							</p>
							<p className="text-center text-muted-foreground text-xs">
								{jobStatus.data?.error ||
									"An error occurred while processing your request."}
							</p>
							<Button
								variant="outline"
								onClick={() => {
									setHasTriggered(false);
									setJobId(null);
								}}
							>
								Try Again
							</Button>
						</div>
					)}

					{/* Results state */}
					{isCompleted && subtasks.length > 0 && (
						<div className="space-y-3">
							{jobStatus.data?.result?.reasoning && (
								<div className="rounded border border-border bg-muted/50 p-3 text-muted-foreground text-xs">
									<strong className="text-foreground">AI Reasoning:</strong>{" "}
									{jobStatus.data.result.reasoning}
								</div>
							)}

							<div className="space-y-2">
								{subtasks.map((subtask, index) => (
									<div
										key={`subtask-${index}`}
										className={cn(
											"group flex items-start gap-3 rounded border border-border p-3 transition-colors",
											subtask.selected
												? "bg-card"
												: "bg-muted/30 opacity-60",
										)}
									>
										<Checkbox
											checked={subtask.selected}
											onCheckedChange={() => handleToggleSubtask(index)}
											className="mt-0.5"
										/>
										<div className="min-w-0 flex-1">
											<p
												className={cn(
													"font-medium text-sm",
													!subtask.selected && "line-through",
												)}
											>
												{subtask.title}
											</p>
											{subtask.description && (
												<p className="mt-1 text-muted-foreground text-xs">
													{subtask.description}
												</p>
											)}
											<div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
												{subtask.estimatedHours && (
													<span className="flex items-center gap-1">
														<Clock className="size-3" />
														{subtask.estimatedHours}h
													</span>
												)}
												{subtask.priority && (
													<span
														className={cn(
															"flex items-center gap-1",
															TASK_PRIORITY_CONFIG[subtask.priority].color,
														)}
													>
														<Flag className="size-3" />
														{TASK_PRIORITY_CONFIG[subtask.priority].label}
													</span>
												)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											className="opacity-0 transition-opacity group-hover:opacity-100"
											onClick={() => handleRemoveSubtask(index)}
										>
											<Trash2 className="size-3.5" />
											<span className="sr-only">Remove subtask</span>
										</Button>
									</div>
								))}
							</div>

							{subtasks.length === 0 && (
								<p className="py-4 text-center text-muted-foreground text-sm">
									All subtasks have been removed.
								</p>
							)}
						</div>
					)}

					{/* No subtasks generated */}
					{isCompleted && subtasks.length === 0 && !jobStatus.data?.result?.subtasks?.length && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<p className="text-center text-muted-foreground text-sm">
								The AI could not generate subtasks for this task. The task may
								already be small enough or too vague.
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<DialogClose render={<Button variant="outline" type="button" />}>
						<X className="size-4" />
						Cancel
					</DialogClose>
					{isCompleted && subtasks.length > 0 && (
						<Button
							onClick={handleAccept}
							disabled={acceptDecomposition.isPending}
						>
							{acceptDecomposition.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Check className="size-4" />
							)}
							Accept {selectedCount > 0 ? `(${selectedCount})` : ""}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
