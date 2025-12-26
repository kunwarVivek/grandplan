// ============================================
// BILLING MODULE ROUTES
// ============================================

import { Router } from "express";
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

// Subscription Management
router.get("/subscription", getSubscription);
router.get("/plans", getPlans);
router.post("/checkout", createCheckout);
router.post("/portal", createPortal);
router.post("/cancel", cancelSubscription);
router.post("/reactivate", reactivateSubscription);

// Invoices
router.get("/invoices", getInvoices);

// Usage
router.get("/usage", getUsage);
router.get("/usage/:metric", getUsageByMetric);

// Limits & Features
router.get("/limits", checkLimits);
router.get("/features/:feature", checkFeature);

export const billingRoutes = router;

// Webhook routes (separate router, no auth required)
const webhookRouter = Router();
webhookRouter.post("/polar", handlePolarWebhook);
webhookRouter.post("/stripe", handleStripeWebhook);

export const webhookRoutes = webhookRouter;
