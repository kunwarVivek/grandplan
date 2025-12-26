// ============================================
// PRESENCE AVATARS COMPONENT
// ============================================

import { useMemo } from "react";

import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserPresence } from "../types";

type PresenceAvatarsProps = {
	users: UserPresence[];
	maxVisible?: number;
	size?: "sm" | "default" | "lg";
	showStatus?: boolean;
	excludeUserId?: string;
	className?: string;
};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function StatusIndicator({
	status,
	color,
}: {
	status: UserPresence["status"];
	color: string;
}) {
	const statusColors = {
		online: "bg-green-500",
		away: "bg-yellow-500",
		busy: "bg-red-500",
	};

	return (
		<span
			className={cn(
				"absolute bottom-0 right-0 z-10 block rounded-full ring-2 ring-background",
				"h-2.5 w-2.5",
				statusColors[status]
			)}
			style={{ borderColor: color }}
		/>
	);
}

function PresenceAvatar({
	user,
	size = "default",
	showStatus = true,
}: {
	user: UserPresence;
	size?: "sm" | "default" | "lg";
	showStatus?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger render={<div className="relative" />}>
				<Avatar
					size={size}
					style={{
						boxShadow: `0 0 0 2px ${user.color}`,
					}}
				>
					{user.avatar ? (
						<AvatarImage src={user.avatar} alt={user.name} />
					) : null}
					<AvatarFallback
						style={{ backgroundColor: user.color, color: "white" }}
					>
						{getInitials(user.name)}
					</AvatarFallback>
				</Avatar>
				{showStatus && (
					<StatusIndicator status={user.status} color={user.color} />
				)}
			</TooltipTrigger>
			<TooltipContent>
				<div className="flex flex-col">
					<span className="font-medium">{user.name}</span>
					<span className="text-xs text-muted-foreground capitalize">
						{user.status}
						{user.currentPage && ` - ${user.currentPage}`}
					</span>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

export function PresenceAvatars({
	users,
	maxVisible = 5,
	size = "default",
	showStatus = true,
	excludeUserId,
	className,
}: PresenceAvatarsProps) {
	const filteredUsers = useMemo(() => {
		let result = users;
		if (excludeUserId) {
			result = result.filter((u) => u.userId !== excludeUserId);
		}
		// Sort by status (online first, then away, then busy)
		return result.sort((a, b) => {
			const order = { online: 0, away: 1, busy: 2 };
			return order[a.status] - order[b.status];
		});
	}, [users, excludeUserId]);

	const visibleUsers = filteredUsers.slice(0, maxVisible);
	const overflowCount = filteredUsers.length - maxVisible;

	if (filteredUsers.length === 0) {
		return null;
	}

	return (
		<AvatarGroup className={className}>
			{visibleUsers.map((user) => (
				<PresenceAvatar
					key={user.userId}
					user={user}
					size={size}
					showStatus={showStatus}
				/>
			))}
			{overflowCount > 0 && (
				<Tooltip>
					<TooltipTrigger render={<AvatarGroupCount />}>
						+{overflowCount}
					</TooltipTrigger>
					<TooltipContent>
						<div className="flex flex-col gap-1">
							{filteredUsers.slice(maxVisible).map((user) => (
								<div key={user.userId} className="flex items-center gap-2">
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: user.color }}
									/>
									<span>{user.name}</span>
									<span className="text-xs text-muted-foreground capitalize">
										({user.status})
									</span>
								</div>
							))}
						</div>
					</TooltipContent>
				</Tooltip>
			)}
		</AvatarGroup>
	);
}

// Compact version for inline use
export function PresenceIndicator({
	users,
	className,
}: {
	users: UserPresence[];
	className?: string;
}) {
	const onlineCount = users.filter((u) => u.status === "online").length;

	if (onlineCount === 0) return null;

	return (
		<div className={cn("flex items-center gap-1.5 text-xs", className)}>
			<span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
			<span className="text-muted-foreground">
				{onlineCount} {onlineCount === 1 ? "user" : "users"} online
			</span>
		</div>
	);
}

// List version for sidebars
export function PresenceList({
	users,
	onUserClick,
	className,
}: {
	users: UserPresence[];
	onUserClick?: (userId: string) => void;
	className?: string;
}) {
	const sortedUsers = useMemo(() => {
		return [...users].sort((a, b) => {
			const order = { online: 0, away: 1, busy: 2 };
			return order[a.status] - order[b.status];
		});
	}, [users]);

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{sortedUsers.map((user) => (
				<button
					key={user.userId}
					type="button"
					onClick={() => onUserClick?.(user.userId)}
					className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors text-left"
				>
					<div className="relative">
						<Avatar size="sm">
							{user.avatar ? (
								<AvatarImage src={user.avatar} alt={user.name} />
							) : null}
							<AvatarFallback
								style={{ backgroundColor: user.color, color: "white" }}
							>
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>
						<StatusIndicator status={user.status} color={user.color} />
					</div>
					<div className="flex flex-col min-w-0 flex-1">
						<span className="font-medium truncate">{user.name}</span>
						{user.currentPage && (
							<span className="text-xs text-muted-foreground truncate">
								{user.currentPage}
							</span>
						)}
					</div>
				</button>
			))}
		</div>
	);
}
