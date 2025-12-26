import { formatDistanceToNow } from "date-fns";
import {
	CheckSquare,
	MessageSquare,
	Folder,
	Users,
	Building2,
	Link2,
	CreditCard,
	Bell,
	Sparkles,
	MoreHorizontal,
	Check,
	Archive,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/stores/notification-store";
import {
	useMarkAsRead,
	useArchiveNotification,
	useDeleteNotification,
} from "../hooks/use-notifications";

type NotificationItemProps = {
	notification: Notification;
	onClick?: () => void;
};

const NOTIFICATION_ICON_MAP: Record<string, typeof Bell> = {
	// Task notifications
	TASK_ASSIGNED: CheckSquare,
	TASK_MENTIONED: CheckSquare,
	TASK_STATUS_CHANGED: CheckSquare,
	TASK_COMMENT: MessageSquare,
	TASK_DUE_SOON: CheckSquare,
	TASK_OVERDUE: CheckSquare,
	TASK_COMPLETED: CheckSquare,
	TASK_BLOCKED: CheckSquare,
	TASK_DECOMPOSED: CheckSquare,
	// Comment notifications
	COMMENT_REPLY: MessageSquare,
	COMMENT_MENTION: MessageSquare,
	// Project notifications
	PROJECT_INVITED: Folder,
	PROJECT_STATUS_CHANGED: Folder,
	// Team notifications
	TEAM_INVITED: Users,
	TEAM_ROLE_CHANGED: Users,
	// Organization notifications
	ORGANIZATION_INVITED: Building2,
	// Integration notifications
	INTEGRATION_CONNECTED: Link2,
	INTEGRATION_DISCONNECTED: Link2,
	INTEGRATION_ERROR: Link2,
	// Billing notifications
	BILLING_PAYMENT_SUCCESS: CreditCard,
	BILLING_PAYMENT_FAILED: CreditCard,
	BILLING_SUBSCRIPTION_UPDATED: CreditCard,
	BILLING_TRIAL_ENDING: CreditCard,
	// System notifications
	SYSTEM_ANNOUNCEMENT: Bell,
	SYSTEM_MAINTENANCE: Bell,
	SYSTEM_UPDATE: Bell,
	// AI notifications
	AI_SUGGESTION: Sparkles,
};

function getNotificationIcon(type: NotificationType) {
	return NOTIFICATION_ICON_MAP[type] || Bell;
}

function getNotificationColor(type: NotificationType): string {
	if (type.startsWith("TASK_")) return "text-blue-500 bg-blue-500/10";
	if (type.startsWith("COMMENT_")) return "text-purple-500 bg-purple-500/10";
	if (type.startsWith("PROJECT_")) return "text-emerald-500 bg-emerald-500/10";
	if (type.startsWith("TEAM_")) return "text-amber-500 bg-amber-500/10";
	if (type.startsWith("ORGANIZATION_")) return "text-indigo-500 bg-indigo-500/10";
	if (type.startsWith("INTEGRATION_")) return "text-cyan-500 bg-cyan-500/10";
	if (type.startsWith("BILLING_")) return "text-pink-500 bg-pink-500/10";
	if (type.startsWith("SYSTEM_")) return "text-muted-foreground bg-muted";
	if (type === "AI_SUGGESTION") return "text-violet-500 bg-violet-500/10";
	return "text-muted-foreground bg-muted";
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
	const markAsRead = useMarkAsRead();
	const archiveNotification = useArchiveNotification();
	const deleteNotification = useDeleteNotification();

	const Icon = getNotificationIcon(notification.type);
	const iconColor = getNotificationColor(notification.type);

	const handleClick = () => {
		if (!notification.read) {
			markAsRead.mutate(notification.id);
		}
		onClick?.();
	};

	const handleMarkAsRead = (e: React.MouseEvent) => {
		e.stopPropagation();
		markAsRead.mutate(notification.id);
	};

	const handleArchive = (e: React.MouseEvent) => {
		e.stopPropagation();
		archiveNotification.mutate(notification.id);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		deleteNotification.mutate(notification.id);
	};

	const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
		addSuffix: true,
	});

	return (
		<div
			className={cn(
				"group flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
				!notification.read && "bg-primary/5"
			)}
			onClick={handleClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick();
				}
			}}
		>
			<div
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full",
					iconColor
				)}
			>
				<Icon className="size-4" />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p
						className={cn(
							"text-sm leading-snug",
							!notification.read && "font-medium"
						)}
					>
						{notification.title}
					</p>
					{!notification.read && (
						<span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
					)}
				</div>
				<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
					{notification.body}
				</p>
				<p className="mt-1 text-xs text-muted-foreground/70">{timeAgo}</p>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon-xs"
							className="shrink-0 opacity-0 group-hover:opacity-100"
							onClick={(e) => e.stopPropagation()}
						/>
					}
				>
					<MoreHorizontal className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{!notification.read && (
						<DropdownMenuItem onClick={handleMarkAsRead}>
							<Check className="mr-2 size-4" />
							Mark as read
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={handleArchive}>
						<Archive className="mr-2 size-4" />
						Archive
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={handleDelete}
						className="text-destructive focus:text-destructive"
					>
						<Trash2 className="mr-2 size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
