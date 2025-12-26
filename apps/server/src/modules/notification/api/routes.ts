// ============================================
// NOTIFICATION MODULE ROUTES
// ============================================

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

// Notification listing and details
router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/summary", getNotificationSummary);
router.get("/:id", getNotification);

// Read status management
router.patch("/:id/read", markAsRead);
router.post("/read-multiple", markMultipleAsRead);
router.post("/read-all", markAllAsRead);

// Archive and delete
router.post("/:id/archive", archiveNotification);
router.delete("/:id", deleteNotification);

// Preferences
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

// Push notifications
router.post("/push/subscribe", registerPushSubscription);
router.post("/push/unsubscribe", unregisterPushSubscription);
router.get("/push/subscriptions", getPushSubscriptions);

export const notificationRoutes = router;
