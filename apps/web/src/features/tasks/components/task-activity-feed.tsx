import {
	ArrowRightIcon,
	BotIcon,
	ClockIcon,
	EditIcon,
	GitBranchIcon,
	Loader2Icon,
	MoreHorizontalIcon,
	PlusIcon,
	SendIcon,
	Trash2Icon,
	UserMinusIcon,
	UserPlusIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUser } from "@/stores/auth-store";
import {
	useAddComment,
	useDeleteComment,
	useTaskComments,
	useTaskHistory,
	useUpdateComment,
} from "../hooks/use-tasks";
import type {
	ActivityItem,
	TaskComment,
	TaskHistory,
	TaskHistoryAction,
} from "../types";
import { TASK_STATUS_CONFIG } from "../types";

// ============================================
// HELPER FUNCTIONS
// ============================================

function getInitials(name: string | null | undefined): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatRelativeTime(date: Date | string): string {
	const d = new Date(date);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffSec < 60) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	if (diffDay < 7) return `${diffDay}d ago`;

	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}

function getHistoryActionInfo(action: TaskHistoryAction): {
	icon: React.ReactNode;
	color: string;
	label: string;
} {
	switch (action) {
		case "CREATED":
			return {
				icon: <PlusIcon className="size-3" />,
				color: "bg-emerald-500",
				label: "created this task",
			};
		case "STATUS_CHANGED":
			return {
				icon: <ArrowRightIcon className="size-3" />,
				color: "bg-blue-500",
				label: "changed status",
			};
		case "ASSIGNED":
			return {
				icon: <UserPlusIcon className="size-3" />,
				color: "bg-purple-500",
				label: "assigned",
			};
		case "UNASSIGNED":
			return {
				icon: <UserMinusIcon className="size-3" />,
				color: "bg-amber-500",
				label: "unassigned",
			};
		case "MOVED":
			return {
				icon: <GitBranchIcon className="size-3" />,
				color: "bg-cyan-500",
				label: "moved this task",
			};
		case "DEPENDENCY_ADDED":
			return {
				icon: <PlusIcon className="size-3" />,
				color: "bg-indigo-500",
				label: "added dependency",
			};
		case "DEPENDENCY_REMOVED":
			return {
				icon: <Trash2Icon className="size-3" />,
				color: "bg-red-500",
				label: "removed dependency",
			};
		default:
			return {
				icon: <EditIcon className="size-3" />,
				color: "bg-gray-500",
				label: "updated",
			};
	}
}

function formatStatusValue(value: unknown): string {
	if (typeof value !== "string") return String(value);
	const statusKey = value.toLowerCase().replace("_", "-");
	const config =
		TASK_STATUS_CONFIG[statusKey as keyof typeof TASK_STATUS_CONFIG];
	return config?.label ?? value;
}

// ============================================
// COMMENT FORM COMPONENT
// ============================================

type CommentFormProps = {
	taskId: string;
	onCancel?: () => void;
	editingComment?: TaskComment | null;
	onEditComplete?: () => void;
};

function CommentForm({
	taskId,
	onCancel,
	editingComment,
	onEditComplete,
}: CommentFormProps) {
	const [content, setContent] = useState(editingComment?.content ?? "");
	const addComment = useAddComment();
	const updateComment = useUpdateComment();

	const isEditing = !!editingComment;
	const isPending = addComment.isPending || updateComment.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim() || isPending) return;

		if (isEditing && editingComment) {
			updateComment.mutate(
				{
					taskId,
					commentId: editingComment.id,
					content: content.trim(),
				},
				{
					onSuccess: () => {
						setContent("");
						onEditComplete?.();
					},
				},
			);
		} else {
			addComment.mutate(
				{
					taskId,
					content: content.trim(),
				},
				{
					onSuccess: () => {
						setContent("");
					},
				},
			);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			handleSubmit(e);
		}
		if (e.key === "Escape" && onCancel) {
			onCancel();
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-2">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Write a comment... (Cmd+Enter to submit)"
				className="min-h-20 resize-none text-sm"
				disabled={isPending}
				autoFocus={isEditing}
			/>
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-xs">
					Supports markdown formatting
				</span>
				<div className="flex gap-2">
					{onCancel && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onCancel}
							disabled={isPending}
						>
							Cancel
						</Button>
					)}
					<Button
						type="submit"
						size="sm"
						disabled={!content.trim() || isPending}
					>
						{isPending ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : (
							<SendIcon className="size-3.5" />
						)}
						{isEditing ? "Update" : "Comment"}
					</Button>
				</div>
			</div>
		</form>
	);
}

// ============================================
// COMMENT ITEM COMPONENT
// ============================================

type CommentItemProps = {
	comment: TaskComment;
	taskId: string;
	currentUserId?: string;
};

function CommentItem({ comment, taskId, currentUserId }: CommentItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const deleteComment = useDeleteComment();

	const isOwner = currentUserId && comment.authorId === currentUserId;
	const authorName = comment.author?.name ?? comment.author?.email ?? "Unknown";

	const handleDelete = () => {
		deleteComment.mutate(
			{ taskId, commentId: comment.id },
			{
				onSuccess: () => {
					setShowDeleteDialog(false);
				},
			},
		);
	};

	// Simple markdown-like rendering for basic formatting
	const renderContent = (content: string) => {
		// Basic markdown: **bold**, *italic*, `code`
		const lines = content.split("\n");
		return lines.map((line, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: lines are static and won't reorder
			<span key={i}>
				{i > 0 && <br />}
				{line}
			</span>
		));
	};

	if (isEditing) {
		return (
			<div className="pl-10">
				<CommentForm
					taskId={taskId}
					editingComment={comment}
					onCancel={() => setIsEditing(false)}
					onEditComplete={() => setIsEditing(false)}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="group flex gap-3">
				<Avatar size="sm">
					{comment.author?.image ? (
						<AvatarImage src={comment.author.image} alt={authorName} />
					) : (
						<AvatarFallback>{getInitials(authorName)}</AvatarFallback>
					)}
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-xs">{authorName}</span>
						{comment.aiGenerated && (
							<Badge variant="secondary" className="h-4 px-1 text-[10px]">
								<BotIcon className="mr-0.5 size-2.5" />
								AI
							</Badge>
						)}
						<span className="text-muted-foreground text-xs">
							{formatRelativeTime(comment.createdAt)}
						</span>
						{comment.updatedAt &&
							new Date(comment.updatedAt).getTime() >
								new Date(comment.createdAt).getTime() + 1000 && (
								<span className="text-muted-foreground text-xs">(edited)</span>
							)}
						{isOwner && (
							<DropdownMenu>
								<DropdownMenuTrigger>
									<Button
										variant="ghost"
										size="xs"
										className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<MoreHorizontalIcon className="size-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setIsEditing(true)}>
										<EditIcon className="size-3" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										variant="destructive"
										onClick={() => setShowDeleteDialog(true)}
									>
										<Trash2Icon className="size-3" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					<div className="mt-1 whitespace-pre-wrap break-words text-sm">
						{renderContent(comment.content)}
					</div>
				</div>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete comment?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your
							comment.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteComment.isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ============================================
// HISTORY ITEM COMPONENT
// ============================================

type HistoryItemProps = {
	history: TaskHistory;
};

function HistoryItem({ history }: HistoryItemProps) {
	const { icon, color, label } = getHistoryActionInfo(
		history.action as TaskHistoryAction,
	);
	const actorName = history.actor?.name ?? history.actor?.email ?? "System";

	const renderChangeDetails = () => {
		if (history.action === "STATUS_CHANGED" && history.field === "status") {
			return (
				<span className="text-muted-foreground">
					from{" "}
					<span className="font-medium text-foreground">
						{formatStatusValue(history.oldValue)}
					</span>{" "}
					to{" "}
					<span className="font-medium text-foreground">
						{formatStatusValue(history.newValue)}
					</span>
				</span>
			);
		}

		if (history.action === "ASSIGNED") {
			return (
				<span className="text-muted-foreground">
					to{" "}
					<span className="font-medium text-foreground">
						{String(history.newValue) || "someone"}
					</span>
				</span>
			);
		}

		if (history.action === "UPDATED" && history.field) {
			return (
				<span className="text-muted-foreground">
					<span className="font-medium text-foreground">{history.field}</span>
				</span>
			);
		}

		return null;
	};

	return (
		<div className="flex items-start gap-3">
			<div
				className={cn(
					"flex size-6 items-center justify-center rounded-full text-white",
					color,
				)}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1 pt-0.5">
				<div className="flex flex-wrap items-center gap-1 text-xs">
					<span className="font-medium">{actorName}</span>
					{history.aiTriggered && (
						<Badge variant="secondary" className="h-4 px-1 text-[10px]">
							<BotIcon className="mr-0.5 size-2.5" />
							AI
						</Badge>
					)}
					<span className="text-muted-foreground">{label}</span>
					{renderChangeDetails()}
					<span className="text-muted-foreground">
						{formatRelativeTime(history.createdAt)}
					</span>
				</div>
				{history.reason && (
					<p className="mt-1 text-muted-foreground text-xs italic">
						{history.reason}
					</p>
				)}
			</div>
		</div>
	);
}

// ============================================
// LOADING SKELETON
// ============================================

function ActivitySkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex gap-3">
					<Skeleton className="size-6 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-3 w-32" />
						<Skeleton className="h-4 w-full" />
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================
// MAIN COMPONENT
// ============================================

type TaskActivityFeedProps = {
	taskId: string;
};

export function TaskActivityFeed({ taskId }: TaskActivityFeedProps) {
	const user = useUser();
	const [showHistory, setShowHistory] = useState(true);

	const {
		data: comments,
		isLoading: commentsLoading,
		error: commentsError,
	} = useTaskComments(taskId);

	const {
		data: historyData,
		isLoading: historyLoading,
		error: historyError,
	} = useTaskHistory(taskId, { limit: 50 });

	const isLoading = commentsLoading || historyLoading;
	const hasError = commentsError || historyError;

	// Merge and sort comments and history
	const activityItems = useMemo(() => {
		const items: ActivityItem[] = [];

		// Add comments
		if (comments) {
			for (const comment of comments) {
				items.push({
					type: "comment",
					data: comment,
					timestamp: new Date(comment.createdAt),
				});
			}
		}

		// Add history if enabled
		if (showHistory && historyData?.history) {
			for (const history of historyData.history) {
				items.push({
					type: "history",
					data: history,
					timestamp: new Date(history.createdAt),
				});
			}
		}

		// Sort by timestamp ascending (oldest first)
		items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		return items;
	}, [comments, historyData, showHistory]);

	const commentCount = comments?.length ?? 0;
	const historyCount = historyData?.total ?? 0;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<ActivitySkeleton />
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="py-4 text-center text-muted-foreground text-xs">
				Failed to load activity. Please try again.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filter toggle */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="h-5 text-[10px]">
						{commentCount} comment{commentCount !== 1 ? "s" : ""}
					</Badge>
					{showHistory && (
						<Badge variant="outline" className="h-5 text-[10px]">
							{historyCount} event{historyCount !== 1 ? "s" : ""}
						</Badge>
					)}
				</div>
				<Button
					variant="ghost"
					size="xs"
					onClick={() => setShowHistory(!showHistory)}
					className="text-xs"
				>
					<ClockIcon className="size-3" />
					{showHistory ? "Hide history" : "Show history"}
				</Button>
			</div>

			{/* Activity list */}
			{activityItems.length > 0 ? (
				<div className="space-y-4">
					{activityItems.map((item) => (
						<div
							key={`${item.type}-${item.type === "comment" ? item.data.id : item.data.id}`}
						>
							{item.type === "comment" ? (
								<CommentItem
									comment={item.data}
									taskId={taskId}
									currentUserId={user?.id}
								/>
							) : (
								<HistoryItem history={item.data} />
							)}
						</div>
					))}
				</div>
			) : (
				<div className="py-6 text-center text-muted-foreground text-xs">
					No activity yet
				</div>
			)}

			{/* Comment form */}
			<div className="border-border border-t pt-4">
				<CommentForm taskId={taskId} />
			</div>
		</div>
	);
}
