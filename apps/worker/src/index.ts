// ============================================
// WORKER APP - Background job processor
// ============================================

import { createServer } from "node:http";
import { eventBus } from "@grandplan/events";
import { queueManager } from "@grandplan/queue";
import Redis from "ioredis";
import { setupScheduledJobs } from "./scheduled-jobs.js";
import { registerAIDecompositionWorker } from "./workers/ai-decomposition-worker.js";
import { registerDigestWorker } from "./workers/digest-worker.js";
import { registerEmailWorker } from "./workers/email-worker.js";
import { registerIntegrationSyncWorker } from "./workers/integration-sync-worker.js";
import { registerIntegrationWebhookWorker } from "./workers/integration-webhook-worker.js";
import { registerMaintenanceWorker } from "./workers/maintenance-worker.js";
// Import workers
import { registerNotificationWorker } from "./workers/notification-worker.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? "3001");

// Track worker health state
let isHealthy = false;

async function main(): Promise<void> {
	console.log("Starting GrandPlan Worker...");

	// Connect to Redis
	const redis = new Redis(REDIS_URL, {
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
		if (req.url === "/health" || req.url === "/healthz") {
			if (isHealthy) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
			} else {
				res.writeHead(503, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ status: "unhealthy", timestamp: new Date().toISOString() }));
			}
		} else if (req.url === "/ready") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ready", timestamp: new Date().toISOString() }));
		} else {
			res.writeHead(404);
			res.end("Not Found");
		}
	});

	healthServer.listen(HEALTH_PORT, () => {
		console.log(`Health check server listening on port ${HEALTH_PORT}`);
	});

	// Graceful shutdown
	const shutdown = async (signal: string): Promise<void> => {
		console.log(`Received ${signal}, shutting down gracefully...`);
		isHealthy = false;

		healthServer.close();
		await queueManager.disconnect();
		await eventBus.disconnect();
		await redis.quit();

		console.log("Worker shutdown complete");
		process.exit(0);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
	console.error("Worker failed to start:", error);
	process.exit(1);
});
