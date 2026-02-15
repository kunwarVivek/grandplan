// ============================================
// PLATFORM MODULE ROUTES
// ============================================

import { Router } from "express";
import {
	exportAnalytics,
	getGrowth,
	getOverview,
	getRevenue,
	getUsage,
} from "./controllers/analytics.controller.js";
import {
	adjustSubscription,
	deleteOrganization,
	getOrgAuditLog,
	getOrganization,
	listOrganizations,
	suspendOrganization,
	transferOwnership,
	unsuspendOrganization,
	updateOrganization,
} from "./controllers/organizations.controller.js";
import {
	createPlan,
	deletePlan,
	getPlan,
	listPlans,
	updatePlan,
} from "./controllers/plans.controller.js";
import {
	createAnnouncement,
	createFeatureFlag,
	deleteAnnouncement,
	deleteFeatureFlag,
	getAnnouncement,
	getFeatureFlag,
	getSettings,
	listAnnouncements,
	listFeatureFlags,
	toggleMaintenanceMode,
	updateAnnouncement,
	updateFeatureFlag,
	updateSettings,
} from "./controllers/system.controller.js";
import {
	banUser,
	createUser,
	deleteUser,
	getUser,
	getUserActivity,
	impersonateUser,
	listUsers,
	unbanUser,
	updateUser,
} from "./controllers/users.controller.js";
import {
	requirePlatformAuth,
	requirePlatformPermission,
	requireSuperAdmin,
} from "./middleware/platform-auth.middleware.js";

const router = Router();

// ============================================
// PUBLIC PLATFORM ROUTES (before auth middleware)
// ============================================

// Check if current user is a platform admin (for frontend routing)
router.get("/admin/check", async (req, res, next) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.json({ isPlatformAdmin: false });
			return;
		}

		const { db } = await import("@grandplan/db");
		const platformAdmin = await db.platformAdmin.findUnique({
			where: { userId },
			select: { id: true, role: true },
		});

		res.json({
			isPlatformAdmin: !!platformAdmin,
			role: platformAdmin?.role ?? null,
		});
	} catch (error) {
		next(error);
	}
});

// All subsequent platform routes require platform admin authentication
router.use(requirePlatformAuth);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

router.post(
	"/users",
	requirePlatformPermission("platform:users:write"),
	createUser,
);

router.get(
	"/users",
	requirePlatformPermission("platform:users:read"),
	listUsers,
);

router.get(
	"/users/:id",
	requirePlatformPermission("platform:users:read"),
	getUser,
);

router.patch(
	"/users/:id",
	requirePlatformPermission("platform:users:write"),
	updateUser,
);

router.post(
	"/users/:id/ban",
	requirePlatformPermission("platform:users:write"),
	banUser,
);

router.post(
	"/users/:id/unban",
	requirePlatformPermission("platform:users:write"),
	unbanUser,
);

router.delete(
	"/users/:id",
	requirePlatformPermission("platform:users:delete"),
	deleteUser,
);

router.post(
	"/users/:id/impersonate",
	requirePlatformPermission("platform:users:impersonate"),
	impersonateUser,
);

router.get(
	"/users/:id/activity",
	requirePlatformPermission("platform:users:read"),
	getUserActivity,
);

// ============================================
// ORGANIZATION MANAGEMENT ROUTES
// ============================================

router.get(
	"/organizations",
	requirePlatformPermission("platform:organizations:read"),
	listOrganizations,
);

router.get(
	"/organizations/:id",
	requirePlatformPermission("platform:organizations:read"),
	getOrganization,
);

router.patch(
	"/organizations/:id",
	requirePlatformPermission("platform:organizations:write"),
	updateOrganization,
);

router.post(
	"/organizations/:id/suspend",
	requirePlatformPermission("platform:organizations:write"),
	suspendOrganization,
);

router.post(
	"/organizations/:id/unsuspend",
	requirePlatformPermission("platform:organizations:write"),
	unsuspendOrganization,
);

router.delete(
	"/organizations/:id",
	requirePlatformPermission("platform:organizations:delete"),
	deleteOrganization,
);

router.post(
	"/organizations/:id/transfer-ownership",
	requirePlatformPermission("platform:organizations:write"),
	transferOwnership,
);

router.get(
	"/organizations/:id/audit-log",
	requirePlatformPermission("platform:organizations:read"),
	getOrgAuditLog,
);

router.post(
	"/organizations/:id/adjust-subscription",
	requirePlatformPermission("platform:organizations:write"),
	adjustSubscription,
);

// ============================================
// ANALYTICS ROUTES
// ============================================

router.get(
	"/analytics/overview",
	requirePlatformPermission("platform:analytics:read"),
	getOverview,
);

router.get(
	"/analytics/revenue",
	requirePlatformPermission("platform:analytics:read"),
	getRevenue,
);

router.get(
	"/analytics/usage",
	requirePlatformPermission("platform:analytics:read"),
	getUsage,
);

router.get(
	"/analytics/growth",
	requirePlatformPermission("platform:analytics:read"),
	getGrowth,
);

router.get(
	"/analytics/export",
	requirePlatformPermission("platform:analytics:export"),
	exportAnalytics,
);

// ============================================
// SYSTEM CONFIGURATION ROUTES
// ============================================

router.get(
	"/system/config",
	requirePlatformPermission("platform:system:read"),
	getSettings,
);

router.patch(
	"/system/config",
	requirePlatformPermission("platform:system:write"),
	updateSettings,
);

router.post("/system/maintenance", requireSuperAdmin, toggleMaintenanceMode);

// ============================================
// FEATURE FLAGS ROUTES
// ============================================

router.get(
	"/system/feature-flags",
	requirePlatformPermission("platform:feature-flags:read"),
	listFeatureFlags,
);

router.get(
	"/system/feature-flags/:key",
	requirePlatformPermission("platform:feature-flags:read"),
	getFeatureFlag,
);

router.post(
	"/system/feature-flags",
	requirePlatformPermission("platform:feature-flags:write"),
	createFeatureFlag,
);

router.patch(
	"/system/feature-flags/:key",
	requirePlatformPermission("platform:feature-flags:write"),
	updateFeatureFlag,
);

router.delete(
	"/system/feature-flags/:key",
	requirePlatformPermission("platform:feature-flags:write"),
	deleteFeatureFlag,
);

// ============================================
// ANNOUNCEMENTS ROUTES
// ============================================

router.get(
	"/announcements",
	requirePlatformPermission("platform:announcements:read"),
	listAnnouncements,
);

router.get(
	"/announcements/:id",
	requirePlatformPermission("platform:announcements:read"),
	getAnnouncement,
);

router.post(
	"/announcements",
	requirePlatformPermission("platform:announcements:write"),
	createAnnouncement,
);

router.patch(
	"/announcements/:id",
	requirePlatformPermission("platform:announcements:write"),
	updateAnnouncement,
);

router.delete(
	"/announcements/:id",
	requirePlatformPermission("platform:announcements:write"),
	deleteAnnouncement,
);

// ============================================
// PLAN MANAGEMENT ROUTES
// ============================================

router.get("/plans", requirePlatformPermission("platform:plans:read"), listPlans);

router.get(
	"/plans/:id",
	requirePlatformPermission("platform:plans:read"),
	getPlan,
);

router.post(
	"/plans",
	requirePlatformPermission("platform:plans:write"),
	createPlan,
);

router.patch(
	"/plans/:id",
	requirePlatformPermission("platform:plans:write"),
	updatePlan,
);

router.delete(
	"/plans/:id",
	requirePlatformPermission("platform:plans:delete"),
	deletePlan,
);

export const platformRoutes = router;

// ============================================
// ADMIN ROUTES (alias for /api/admin/*)
// ============================================
// The frontend calls /api/admin/plans, so we provide an alias router

const adminRouter = Router();

// All admin routes require platform admin authentication
adminRouter.use(requirePlatformAuth);

// Plan management routes
adminRouter.get(
	"/plans",
	requirePlatformPermission("platform:plans:read"),
	listPlans,
);

adminRouter.get(
	"/plans/:id",
	requirePlatformPermission("platform:plans:read"),
	getPlan,
);

adminRouter.post(
	"/plans",
	requirePlatformPermission("platform:plans:write"),
	createPlan,
);

adminRouter.patch(
	"/plans/:id",
	requirePlatformPermission("platform:plans:write"),
	updatePlan,
);

adminRouter.delete(
	"/plans/:id",
	requirePlatformPermission("platform:plans:delete"),
	deletePlan,
);

export const adminRoutes = adminRouter;
