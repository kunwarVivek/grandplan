// ============================================
// QUEUE MANAGER - BullMQ Queue Management
// ============================================

import {
	type Job,
	type Processor,
	Queue,
	Worker,
	type WorkerOptions,
} from "bullmq";
import type { Redis } from "ioredis";
import { createLogger } from "@grandplan/core";
import { QUEUE_CONFIGS } from "./queues.js";
import type { JobResult, QueueName } from "./types.js";

const logger = createLogger({ context: { service: "queue" } });

export class QueueManager {
	private queues: Map<QueueName, Queue> = new Map();
	private workers: Map<QueueName, Worker> = new Map();
	private connection: Redis | null = null;

	async connect(redisConnection: Redis): Promise<void> {
		this.connection = redisConnection;

		// Initialize all queues
		for (const config of Object.values(QUEUE_CONFIGS)) {
			const queue = new Queue(config.name, {
				connection: this.connection,
				defaultJobOptions: config.defaultJobOptions,
			});
			this.queues.set(config.name, queue);
		}

		logger.info("QueueManager connected", { queuesInitialized: true });
	}

	async disconnect(): Promise<void> {
		// Close all workers
		for (const worker of this.workers.values()) {
			await worker.close();
		}
		this.workers.clear();

		// Close all queues
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		this.queues.clear();

		this.connection = null;
	}

	getQueue(name: QueueName): Queue {
		const queue = this.queues.get(name);
		if (!queue) {
			throw new Error(`Queue ${name} not initialized. Call connect() first.`);
		}
		return queue;
	}

	async addJob<T>(
		queueName: QueueName,
		data: T,
		options?: {
			jobId?: string;
			delay?: number;
			priority?: number;
		},
	): Promise<Job<T>> {
		const queue = this.getQueue(queueName);
		const config = QUEUE_CONFIGS[queueName];

		return queue.add(queueName, data, {
			...config.defaultJobOptions,
			...options,
		});
	}

	async addBulkJobs<T>(
		queueName: QueueName,
		jobs: Array<{ data: T; options?: { jobId?: string; delay?: number } }>,
	): Promise<Job<T>[]> {
		const queue = this.getQueue(queueName);

		return queue.addBulk(
			jobs.map((job) => ({
				name: queueName,
				data: job.data,
				opts: job.options,
			})),
		);
	}

	registerWorker<T, R = JobResult>(
		queueName: QueueName,
		processor: Processor<T, R>,
		options?: Partial<WorkerOptions>,
	): Worker<T, R> {
		if (!this.connection) {
			throw new Error("QueueManager not connected. Call connect() first.");
		}

		const config = QUEUE_CONFIGS[queueName];
		const workerOptions: WorkerOptions = {
			connection: this.connection,
			...options,
		};

		// Apply rate limiter if configured
		if (config.rateLimiter) {
			workerOptions.limiter = config.rateLimiter;
		}

		const worker = new Worker<T, R>(queueName, processor, workerOptions);

		// Set up event handlers
		worker.on("completed", (job: Job<T, R>) => {
			logger.debug("Job completed", { jobId: job.id, queueName, result: "success" });
		});

		worker.on("failed", (job: Job<T, R> | undefined, error: Error) => {
			logger.error("Job failed", error, { jobId: job?.id, queueName });
		});

		worker.on("error", (error: Error) => {
			logger.error("Worker error", error, { queueName });
		});

		this.workers.set(queueName, worker as Worker);
		return worker;
	}

	async getJobCounts(queueName: QueueName): Promise<{
		waiting: number;
		active: number;
		completed: number;
		failed: number;
		delayed: number;
	}> {
		const queue = this.getQueue(queueName);
		const counts = await queue.getJobCounts(
			"waiting",
			"active",
			"completed",
			"failed",
			"delayed",
		);
		return {
			waiting: counts.waiting ?? 0,
			active: counts.active ?? 0,
			completed: counts.completed ?? 0,
			failed: counts.failed ?? 0,
			delayed: counts.delayed ?? 0,
		};
	}

	async pauseQueue(queueName: QueueName): Promise<void> {
		const queue = this.getQueue(queueName);
		await queue.pause();
	}

	async resumeQueue(queueName: QueueName): Promise<void> {
		const queue = this.getQueue(queueName);
		await queue.resume();
	}

	async cleanQueue(
		queueName: QueueName,
		grace: number,
		status: "completed" | "failed" = "completed",
	): Promise<string[]> {
		const queue = this.getQueue(queueName);
		return queue.clean(grace, 1000, status);
	}

	// Scheduled job helpers
	async scheduleRecurringJob<T>(
		queueName: QueueName,
		jobId: string,
		data: T,
		pattern: string, // cron pattern
	): Promise<Job<T>> {
		const queue = this.getQueue(queueName);

		// Remove existing job with same ID if exists
		const existingJob = await queue.getJob(jobId);
		if (existingJob) {
			await existingJob.remove();
		}

		return queue.add(queueName, data, {
			jobId,
			repeat: {
				pattern,
			},
		});
	}

	async removeRecurringJob(
		queueName: QueueName,
		jobId: string,
	): Promise<boolean> {
		const queue = this.getQueue(queueName);
		return queue.removeRepeatableByKey(jobId);
	}

	/**
	 * Get health status for all queues
	 */
	async getHealthStatus(): Promise<{
		healthy: boolean;
		queues: Record<
			string,
			{
				status: "ok" | "error";
				waiting: number;
				active: number;
				failed: number;
			}
		>;
	}> {
		const queues: Record<
			string,
			{
				status: "ok" | "error";
				waiting: number;
				active: number;
				failed: number;
			}
		> = {};
		let healthy = true;

		for (const [name, queue] of this.queues) {
			try {
				const counts = await queue.getJobCounts(
					"waiting",
					"active",
					"failed",
				);
				queues[name] = {
					status: "ok",
					waiting: counts.waiting ?? 0,
					active: counts.active ?? 0,
					failed: counts.failed ?? 0,
				};
			} catch {
				queues[name] = {
					status: "error",
					waiting: 0,
					active: 0,
					failed: 0,
				};
				healthy = false;
			}
		}

		return { healthy, queues };
	}

	/**
	 * Check if any workers are currently processing jobs
	 */
	hasActiveJobs(): boolean {
		for (const worker of this.workers.values()) {
			if (worker.isRunning()) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Gracefully drain all workers (stop accepting new jobs, wait for current ones)
	 */
	async drainWorkers(timeoutMs = 30000): Promise<void> {
		logger.info("Draining workers", { timeout: timeoutMs });

		// Pause all workers to stop accepting new jobs
		const pausePromises = Array.from(this.workers.values()).map((worker) =>
			worker.pause(true), // Wait for current jobs to complete
		);

		// Wait with timeout
		await Promise.race([
			Promise.all(pausePromises),
			new Promise((resolve) => setTimeout(resolve, timeoutMs)),
		]);

		logger.info("Workers drained successfully");
	}
}

// Singleton instance
export const queueManager = new QueueManager();
