// ============================================
// POLAR WEBHOOK HANDLER
// ============================================

import type { NextFunction, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { webhookService } from "../../application/services/webhook.service.js";

// Maximum allowed age of a webhook request in seconds (5 minutes)
const WEBHOOK_MAX_AGE_SECONDS = 300;

/**
 * Verify Polar webhook signature using HMAC-SHA256
 * Polar uses the format: t=<timestamp>,v1=<signature>
 * @throws Error if signature is invalid or timestamp is too old
 */
function verifyPolarSignature(
	payload: string,
	signature: string,
	secret: string,
): void {
	// Parse the signature header format: t=<timestamp>,v1=<signature>
	const parts = signature.split(",");
	let timestamp: string | undefined;
	let sig: string | undefined;

	for (const part of parts) {
		if (part.startsWith("t=")) {
			timestamp = part.slice(2);
		} else if (part.startsWith("v1=")) {
			sig = part.slice(3);
		}
	}

	if (!timestamp || !sig) {
		throw new Error("Invalid signature format: missing timestamp or signature");
	}

	// Check for replay attacks - verify timestamp is not too old
	const now = Math.floor(Date.now() / 1000);
	const requestTimestamp = parseInt(timestamp, 10);
	if (isNaN(requestTimestamp)) {
		throw new Error("Invalid timestamp format");
	}

	const age = now - requestTimestamp;
	if (age < 0 && Math.abs(age) > WEBHOOK_MAX_AGE_SECONDS) {
		// Allow for slight clock drift (negative age means request is from the future)
		throw new Error("Webhook timestamp too far in the future");
	}
	if (age > WEBHOOK_MAX_AGE_SECONDS) {
		throw new Error("Webhook request has expired (replay attack detected)");
	}

	// Compute expected signature: HMAC-SHA256 of "<timestamp>.<payload>"
	const signedPayload = `${timestamp}.${payload}`;
	const expectedSig = createHmac("sha256", secret).update(signedPayload).digest("hex");

	// Constant-time comparison to prevent timing attacks
	const expectedBuffer = Buffer.from(expectedSig, "hex");
	const receivedBuffer = Buffer.from(sig, "hex");

	if (
		expectedBuffer.length !== receivedBuffer.length ||
		!timingSafeEqual(expectedBuffer, receivedBuffer)
	) {
		throw new Error("Invalid webhook signature");
	}
}

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
		// Get the raw body - need to ensure we have the original payload
		const payload =
			typeof req.body === "string" ? req.body : JSON.stringify(req.body);

		const signature = (req.headers["polar-signature"] as string) ?? "";

		if (!signature) {
			res.status(401).json({
				success: false,
				error: "Missing Polar-Signature header",
			});
			return;
		}

		// Get webhook secret from environment
		const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

		if (!webhookSecret) {
			console.error("POLAR_WEBHOOK_SECRET is not configured");
			res.status(500).json({
				success: false,
				error: "Webhook configuration error",
			});
			return;
		}

		// Verify the webhook signature
		try {
			verifyPolarSignature(payload, signature, webhookSecret);
		} catch (verificationError) {
			console.error("Polar webhook signature verification failed:", verificationError);
			res.status(401).json({
				success: false,
				error:
					verificationError instanceof Error
						? verificationError.message
						: "Invalid signature",
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
