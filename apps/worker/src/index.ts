// ============================================
// WORKER APP - Background job processor
// ============================================

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { eventBus } from "@grandplan/events";
import { queueManager } from "@grandplan/queue";
import Redis from "ioredis";
import { setupScheduledJobs } from "./scheduled-jobs.js";
import { registerAIDecompositionWorker } from "./workers/ai-decomposition-worker.js";
import { registerAISuggestionsWorker } from "./workers/ai-suggestions-worker.js";
import { registerAnalyticsWorker } from "./workers/analytics-worker.js";
import { registerDigestWorker } from "./workers/digest-worker.js";
import { registerEmailWorker } from "./workers/email-worker.js";
import { registerIntegrationSyncWorker } from "./workers/integration-sync-worker.js";
import { registerIntegrationWebhookWorker } from "./workers/integration-webhook-worker.js";
import { registerMaintenanceWorker } from "./workers/maintenance-worker.js";
// Import workers
import { registerNotificationWorker } from "./workers/notification-worker.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? "3002");
const SHUTDOWN_TIMEOUT_MS = 30000;

// Track worker health state
let isHealthy = false;
let isShuttingDown = false;
let redis: Redis | null = null;

/**
 * Handle health check requests
 */
async function handleHealthRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const url = req.url ?? "";

	// Liveness probe - basic check that worker is running
	if (url === "/health" || url === "/healthz") {
		if (isHealthy && !isShuttingDown) {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "healthy",
				timestamp: new Date().toISOString(),
			}));
		} else {
			res.writeHead(503, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: isShuttingDown ? "shutting_down" : "unhealthy",
				timestamp: new Date().toISOString(),
			}));
		}
		return;
	}

	// Readiness probe - detailed check including queue health
	if (url === "/ready") {
		if (isShuttingDown) {
			res.writeHead(503, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "not_ready",
				reason: "shutting_down",
				timestamp: new Date().toISOString(),
			}));
			return;
		}

		try {
			// Check Redis connectivity
			if (redis) {
				await redis.ping();
			}

			// Get queue health status
			const queueHealth = await queueManager.getHealthStatus();

			const isReady = isHealthy && queueHealth.healthy;
			res.writeHead(isReady ? 200 : 503, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: isReady ? "ready" : "not_ready",
				timestamp: new Date().toISOString(),
				checks: {
					redis: { status: "ok" },
					queues: queueHealth.queues,
				},
			}));
		} catch (error) {
			res.writeHead(503, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "not_ready",
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : "Unknown error",
			}));
		}
		return;
	}

	// Queue metrics endpoint for monitoring
	if (url === "/metrics/queues") {
		try {
			const queueHealth = await queueManager.getHealthStatus();
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				timestamp: new Date().toISOString(),
				queues: queueHealth.queues,
			}));
		} catch (error) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				error: error instanceof Error ? error.message : "Unknown error",
			}));
		}
		return;
	}

	res.writeHead(404);
	res.end("Not Found");
}

async function main(): Promise<void> {
	console.log("Starting GrandPlan Worker...");

	// Connect to Redis
	redis = new Redis(REDIS_URL, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
	});

	console.log("Connected to Redis");

	// Initialize queue manager
	await queueManager.connect(redis);
	console.log("Queue manager initialized");

	// Connect event bus
	await eventBus.connect(REDIS_URL);
	console.log("Event bus connected");

	// Register workers
	registerNotificationWorker();
	registerEmailWorker();
	registerDigestWorker();
	registerAIDecompositionWorker();
	registerAISuggestionsWorker();
	registerAnalyticsWorker();
	registerIntegrationSyncWorker();
	registerIntegrationWebhookWorker();
	registerMaintenanceWorker();

	console.log("All workers registered");

	// Setup scheduled jobs
	await setupScheduledJobs();
	console.log("Scheduled jobs configured");

	// Mark as healthy
	isHealthy = true;
	console.log("Worker is ready and processing jobs");

	// Start health check server
	const healthServer = createServer((req, res) => {
		handleHealthRequest(req, res).catch((err) => {
			console.error("Health check error:", err);
			res.writeHead(500);
			res.end("Internal Server Error");
		});
	});

	healthServer.listen(HEALTH_PORT, () => {
		console.log(`Health check server listening on port ${HEALTH_PORT}`);
	});

	// Graceful shutdown
	const shutdown = async (signal: string): Promise<void> => {
		if (isShuttingDown) {
			console.log("Shutdown already in progress...");
			return;
		}

		console.log(`Received ${signal}, shutting down gracefully...`);
		isShuttingDown = true;
		isHealthy = false;

		// Set a hard timeout for shutdown
		const forceExitTimer = setTimeout(() => {
			console.error("Forced shutdown after timeout");
			process.exit(1);
		}, SHUTDOWN_TIMEOUT_MS);

		try {
			// Close health server first to stop accepting new traffic
			await new Promise<void>((resolve) => healthServer.close(() => resolve()));
			console.log("Health server closed");

			// Drain workers - wait for active jobs to complete
			await queueManager.drainWorkers(SHUTDOWN_TIMEOUT_MS - 5000);
			console.log("Workers drained");

			// Disconnect queue manager (closes workers and queues)
			await queueManager.disconnect();
			console.log("Queue manager disconnected");

			// Disconnect event bus
			await eventBus.disconnect();
			console.log("Event bus disconnected");

			// Close Redis connection
			if (redis) {
				await redis.quit();
			}
			console.log("Redis disconnected");

			clearTimeout(forceExitTimer);
			console.log("Worker shutdown complete");
			process.exit(0);
		} catch (error) {
			console.error("Error during shutdown:", error);
			clearTimeout(forceExitTimer);
			process.exit(1);
		}
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
	console.error("Worker failed to start:", error);
	process.exit(1);
});
