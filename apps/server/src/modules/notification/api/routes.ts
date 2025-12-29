// ============================================
// NOTIFICATION MODULE ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import {
	archiveNotification,
	deleteNotification,
	getNotification,
	getNotificationSummary,
	getPreferences,
	getPushSubscriptions,
	getUnreadCount,
	listNotifications,
	markAllAsRead,
	markAsRead,
	markMultipleAsRead,
	registerPushSubscription,
	unregisterPushSubscription,
	updatePreferences,
} from "./controllers/notification.controller.js";

const router = Router();

// Notification listing and details - require notifications:read
router.get("/", requirePermission("notifications:read"), listNotifications);
router.get(
	"/unread-count",
	requirePermission("notifications:read"),
	getUnreadCount,
);
router.get(
	"/summary",
	requirePermission("notifications:read"),
	getNotificationSummary,
);
router.get("/:id", requirePermission("notifications:read"), getNotification);

// Read status management - require notifications:manage
router.patch(
	"/:id/read",
	requirePermission("notifications:manage"),
	markAsRead,
);
router.post(
	"/read-multiple",
	requirePermission("notifications:manage"),
	markMultipleAsRead,
);
router.post(
	"/read-all",
	requirePermission("notifications:manage"),
	markAllAsRead,
);

// Archive and delete - require notifications:manage
router.post(
	"/:id/archive",
	requirePermission("notifications:manage"),
	archiveNotification,
);
router.delete(
	"/:id",
	requirePermission("notifications:manage"),
	deleteNotification,
);

// Preferences - require notifications:preferences
router.get(
	"/preferences",
	requirePermission("notifications:preferences"),
	getPreferences,
);
router.patch(
	"/preferences",
	requirePermission("notifications:preferences"),
	updatePreferences,
);

// Push notifications - require notifications:push
router.post(
	"/push/subscribe",
	requirePermission("notifications:push"),
	registerPushSubscription,
);
router.post(
	"/push/unsubscribe",
	requirePermission("notifications:push"),
	unregisterPushSubscription,
);
router.get(
	"/push/subscriptions",
	requirePermission("notifications:push"),
	getPushSubscriptions,
);

export const notificationRoutes = router;
