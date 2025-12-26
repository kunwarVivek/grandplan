// ============================================
// WORKER APP - Background job processor
// ============================================

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

	console.log("Worker is ready and processing jobs");

	// Graceful shutdown
	const shutdown = async (signal: string): Promise<void> => {
		console.log(`Received ${signal}, shutting down gracefully...`);

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
