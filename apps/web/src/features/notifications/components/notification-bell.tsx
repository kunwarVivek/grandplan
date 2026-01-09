import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeNotifications } from "@/features/realtime";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "../hooks/use-notifications";
import { NotificationList } from "./notification-list";

type NotificationBellProps = {
	className?: string;
};

export function NotificationBell({ className }: NotificationBellProps) {
	// Initial count from HTTP API
	const { data } = useUnreadCount();
	const initialCount = data?.count ?? 0;

	// Real-time updates via socket
	const { unreadCount: realtimeCount } = useRealtimeNotifications({
		playSound: true,
		showBrowserNotification: true,
	});

	// Use realtime count if we have updates, otherwise fall back to initial
	const unreadCount = realtimeCount > 0 ? realtimeCount : initialCount;

	const formatCount = (count: number) => {
		if (count > 99) return "99+";
		return count.toString();
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={cn("relative", className)}
						aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
					/>
				}
			>
				<Bell className="size-4" />
				{unreadCount > 0 && (
					<Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center bg-red-500 p-0 text-[10px] text-white">
						{formatCount(unreadCount)}
					</Badge>
				)}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
				<NotificationList />
			</PopoverContent>
		</Popover>
	);
}
