// ============================================
// BILLING MODULE ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { webhookRateLimit } from "../../../middleware/index.js";
import {
	cancelSubscription,
	checkFeature,
	checkLimits,
	createCheckout,
	createPortal,
	getInvoices,
	getPlans,
	getSubscription,
	getUsage,
	getUsageByMetric,
	reactivateSubscription,
} from "./controllers/billing.controller.js";
import { handlePolarWebhook } from "./webhooks/polar.webhook.js";
import { handleStripeWebhook } from "./webhooks/stripe.webhook.js";

const router = Router();

// Subscription Management - require billing:read for viewing, billing:manage for mutations
router.get("/subscription", requirePermission("billing:read"), getSubscription);
router.get("/plans", getPlans); // Plans are public (for pricing page)
router.post("/checkout", requirePermission("billing:manage"), createCheckout);
router.post("/portal", requirePermission("billing:manage"), createPortal);
router.post("/cancel", requirePermission("billing:manage"), cancelSubscription);
router.post(
	"/reactivate",
	requirePermission("billing:manage"),
	reactivateSubscription,
);

// Invoices - require billing:read
router.get("/invoices", requirePermission("billing:read"), getInvoices);

// Usage - require billing:read
router.get("/usage", requirePermission("billing:read"), getUsage);
router.get(
	"/usage/:metric",
	requirePermission("billing:read"),
	getUsageByMetric,
);

// Limits & Features - require billing:read (needed for UI feature gating)
router.get("/limits", requirePermission("billing:read"), checkLimits);
router.get(
	"/features/:feature",
	requirePermission("billing:read"),
	checkFeature,
);

export const billingRoutes = router;

// Webhook routes (separate router, no auth required but rate limited)
const webhookRouter = Router();
webhookRouter.use(webhookRateLimit);
webhookRouter.post("/polar", handlePolarWebhook);
webhookRouter.post("/stripe", handleStripeWebhook);

export const webhookRoutes = webhookRouter;
