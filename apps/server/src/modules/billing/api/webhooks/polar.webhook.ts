// ============================================
// POLAR WEBHOOK HANDLER
// ============================================

import type { NextFunction, Request, Response } from "express";
import { webhookService } from "../../application/services/webhook.service.js";

/**
 * Handle Polar webhook
 * POST /api/webhooks/polar
 */
export async function handlePolarWebhook(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		// Get the raw body and signature
		const payload = JSON.stringify(req.body);
		const signature = (req.headers["polar-signature"] as string) ?? "";

		if (!signature) {
			res.status(400).json({
				success: false,
				error: "Missing Polar-Signature header",
			});
			return;
		}

		// Process the webhook
		const result = await webhookService.handleWebhook(
			"polar",
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
		console.error("Polar webhook error:", error);

		// Return 200 to prevent retries for invalid payloads
		if (error instanceof SyntaxError) {
			res.status(400).json({
				success: false,
				error: "Invalid JSON payload",
			});
			return;
		}

		// For other errors, return 500 so Polar will retry
		next(error);
	}
}

/**
 * Polar webhook event types we handle:
 *
 * Subscription Events:
 * - subscription.created
 * - subscription.updated
 * - subscription.canceled
 * - subscription.revoked
 *
 * Checkout Events:
 * - checkout.created
 * - checkout.updated
 *
 * Order Events:
 * - order.created
 * - order.paid
 * - order.refunded
 *
 * Customer Events:
 * - customer.created
 * - customer.updated
 */
export const POLAR_WEBHOOK_EVENTS = [
	"subscription.created",
	"subscription.updated",
	"subscription.canceled",
	"subscription.revoked",
	"checkout.created",
	"checkout.updated",
	"order.created",
	"order.paid",
	"order.refunded",
	"customer.created",
	"customer.updated",
] as const;

export type PolarWebhookEvent = (typeof POLAR_WEBHOOK_EVENTS)[number];
