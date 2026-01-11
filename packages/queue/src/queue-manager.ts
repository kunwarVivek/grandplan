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
import { QUEUE_CONFIGS } from "./queues.js";
import type { JobResult, QueueName } from "./types.js";

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

		console.log("QueueManager connected with all queues initialized");
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
			console.log(`Job ${job.id} in queue ${queueName} completed`);
		});

		worker.on("failed", (job: Job<T, R> | undefined, error: Error) => {
			console.error(
				`Job ${job?.id} in queue ${queueName} failed:`,
				error.message,
			);
		});

		worker.on("error", (error: Error) => {
			console.error(`Worker error in queue ${queueName}:`, error.message);
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
}

// Singleton instance
export const queueManager = new QueueManager();
