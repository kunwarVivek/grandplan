// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================

import type { NextFunction, Request, Response } from "express";
import { webhookService } from "../../application/services/webhook.service.js";

/**
 * Handle Stripe webhook
 * POST /api/webhooks/stripe
 *
 * Note: This endpoint should use express.raw() middleware
 * to get the raw body for signature verification
 */
export async function handleStripeWebhook(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		// Get the raw body and signature
		// Note: In production, req.body should be the raw buffer, not parsed JSON
		const payload =
			typeof req.body === "string" ? req.body : JSON.stringify(req.body);

		const signature = (req.headers["stripe-signature"] as string) ?? "";

		if (!signature) {
			res.status(400).json({
				success: false,
				error: "Missing Stripe-Signature header",
			});
			return;
		}

		// Process the webhook
		const result = await webhookService.handleWebhook(
			"stripe",
			payload,
			signature,
		);

		res.status(200).json({
			success: true,
			data: {
				handled: result.handled,
				eventType: result.eventType,
			},
		});
	} catch (error) {
		console.error("Stripe webhook error:", error);

		// Stripe expects 2xx for successful receipt
		// Return 400 for signature verification failures
		if (error instanceof Error && error.message.includes("signature")) {
			res.status(400).json({
				success: false,
				error: "Invalid signature",
			});
			return;
		}

		// For other errors, return 500 so Stripe will retry
		next(error);
	}
}

/**
 * Stripe webhook event types we handle:
 *
 * Checkout Events:
 * - checkout.session.completed
 * - checkout.session.expired
 *
 * Customer Events:
 * - customer.created
 * - customer.updated
 * - customer.deleted
 *
 * Subscription Events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - customer.subscription.trial_will_end
 * - customer.subscription.paused
 * - customer.subscription.resumed
 *
 * Invoice Events:
 * - invoice.created
 * - invoice.finalized
 * - invoice.paid
 * - invoice.payment_failed
 * - invoice.payment_action_required
 * - invoice.upcoming
 * - invoice.marked_uncollectible
 * - invoice.voided
 *
 * Payment Intent Events:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 */
export const STRIPE_WEBHOOK_EVENTS = [
	"checkout.session.completed",
	"checkout.session.expired",
	"customer.created",
	"customer.updated",
	"customer.deleted",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"customer.subscription.trial_will_end",
	"customer.subscription.paused",
	"customer.subscription.resumed",
	"invoice.created",
	"invoice.finalized",
	"invoice.paid",
	"invoice.payment_failed",
	"invoice.payment_action_required",
	"invoice.upcoming",
	"invoice.marked_uncollectible",
	"invoice.voided",
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
] as const;

export type StripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];

/**
 * Middleware to get raw body for Stripe signature verification
 */
export function stripeRawBodyMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (req.path === "/api/webhooks/stripe") {
		// For Stripe webhooks, we need the raw body
		let data = "";
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => {
			(req as Request & { rawBody: string }).rawBody = data;
			next();
		});
	} else {
		next();
	}
}
