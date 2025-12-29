import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationStore } from "@/stores/notification-store";
import { useMarkAllAsRead, useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";

type NotificationListProps = {
	limit?: number;
	showHeader?: boolean;
	showFooter?: boolean;
	onNotificationClick?: (notificationId: string) => void;
};

export function NotificationList({
	limit = 20,
	showHeader = true,
	showFooter = true,
	onNotificationClick,
}: NotificationListProps) {
	const { isLoading } = useNotifications({ limit });
	const notifications = useNotificationStore((state) => state.notifications);
	const unreadCount = useNotificationStore((state) => state.unreadCount);
	const markAllAsRead = useMarkAllAsRead();

	const handleMarkAllAsRead = () => {
		markAllAsRead.mutate();
	};

	return (
		<div className="flex flex-col">
			{showHeader && (
				<>
					<div className="flex items-center justify-between px-4 py-3">
						<div className="flex items-center gap-2">
							<h3 className="font-medium text-sm">Notifications</h3>
							{unreadCount > 0 && (
								<span className="text-muted-foreground text-xs">
									{unreadCount} unread
								</span>
							)}
						</div>
						<div className="flex items-center gap-1">
							{unreadCount > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={handleMarkAllAsRead}
									disabled={markAllAsRead.isPending}
								>
									<CheckCheck className="mr-1 size-4" />
									Mark all read
								</Button>
							)}
						</div>
					</div>
					<Separator />
				</>
			)}

			<ScrollArea className="max-h-[400px]">
				{isLoading ? (
					<NotificationListSkeleton />
				) : notifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Bell className="mb-2 size-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							No notifications yet
						</p>
						<p className="text-muted-foreground/70 text-xs">
							We'll notify you when something happens
						</p>
					</div>
				) : (
					<div className="divide-y">
						{notifications.slice(0, limit).map((notification) => (
							<NotificationItem
								key={notification.id}
								notification={notification}
								onClick={() => onNotificationClick?.(notification.id)}
							/>
						))}
					</div>
				)}
			</ScrollArea>

			{showFooter && notifications.length > 0 && (
				<>
					<Separator />
					<div className="flex items-center justify-between px-4 py-2">
						<Button
							variant="ghost"
							size="sm"
							render={<Link to="/settings/notifications" />}
						>
							View all
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							render={<Link to="/settings/notifications" />}
						>
							<Settings className="size-4" />
						</Button>
					</div>
				</>
			)}
		</div>
	);
}

function NotificationListSkeleton() {
	return (
		<div className="divide-y">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex gap-3 px-4 py-3">
					<Skeleton className="size-9 shrink-0 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			))}
		</div>
	);
}
