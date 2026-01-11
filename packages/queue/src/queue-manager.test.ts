// ============================================
// QUEUE MANAGER TESTS
// ============================================

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QueueManager } from "./queue-manager.js";
import type { QueueName } from "./types.js";

// Mock BullMQ
vi.mock("bullmq", () => {
	const mockQueue = {
		add: vi.fn().mockResolvedValue({ id: "job-123" }),
		addBulk: vi.fn().mockResolvedValue([{ id: "job-1" }, { id: "job-2" }]),
		getJobCounts: vi.fn().mockResolvedValue({
			waiting: 5,
			active: 2,
			completed: 100,
			failed: 1,
			delayed: 3,
		}),
		getJob: vi.fn().mockResolvedValue(null),
		pause: vi.fn().mockResolvedValue(undefined),
		resume: vi.fn().mockResolvedValue(undefined),
		clean: vi.fn().mockResolvedValue(["job-1", "job-2"]),
		removeRepeatableByKey: vi.fn().mockResolvedValue(true),
		close: vi.fn().mockResolvedValue(undefined),
	};

	const mockWorker = {
		on: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
		pause: vi.fn().mockResolvedValue(undefined),
		isRunning: vi.fn().mockReturnValue(true),
	};

	return {
		Queue: vi.fn(() => mockQueue),
		Worker: vi.fn(() => mockWorker),
	};
});

// Mock Redis connection
const mockRedis = {
	ping: vi.fn().mockResolvedValue("PONG"),
	quit: vi.fn().mockResolvedValue(undefined),
} as unknown as import("ioredis").Redis;

describe("QueueManager", () => {
	let queueManager: QueueManager;

	beforeEach(() => {
		queueManager = new QueueManager();
	});

	afterEach(async () => {
		await queueManager.disconnect();
		vi.clearAllMocks();
	});

	describe("connect", () => {
		it("should initialize all queues on connect", async () => {
			await queueManager.connect(mockRedis);

			// Should be able to get any queue after connect
			expect(() => queueManager.getQueue("notifications")).not.toThrow();
			expect(() => queueManager.getQueue("email")).not.toThrow();
		});
	});

	describe("getQueue", () => {
		it("should throw if not connected", () => {
			expect(() => queueManager.getQueue("notifications")).toThrow(
				"Queue notifications not initialized"
			);
		});

		it("should return queue after connect", async () => {
			await queueManager.connect(mockRedis);
			const queue = queueManager.getQueue("notifications");
			expect(queue).toBeDefined();
		});
	});

	describe("addJob", () => {
		it("should add job to queue", async () => {
			await queueManager.connect(mockRedis);

			const job = await queueManager.addJob("notifications", {
				notificationId: "notif-123",
				channels: ["push"],
			});

			expect(job).toBeDefined();
			expect(job.id).toBe("job-123");
		});

		it("should accept optional job options", async () => {
			await queueManager.connect(mockRedis);

			const job = await queueManager.addJob(
				"email",
				{ to: "test@example.com", templateId: "welcome", data: {} },
				{ delay: 5000, priority: 1 }
			);

			expect(job).toBeDefined();
		});
	});

	describe("addBulkJobs", () => {
		it("should add multiple jobs at once", async () => {
			await queueManager.connect(mockRedis);

			const jobs = await queueManager.addBulkJobs("notifications", [
				{ data: { notificationId: "n1", channels: ["push"] } },
				{ data: { notificationId: "n2", channels: ["email"] } },
			]);

			expect(jobs).toHaveLength(2);
		});
	});

	describe("registerWorker", () => {
		it("should throw if not connected", () => {
			expect(() =>
				queueManager.registerWorker("notifications", async () => ({
					success: true,
				}))
			).toThrow("QueueManager not connected");
		});

		it("should register worker after connect", async () => {
			await queueManager.connect(mockRedis);

			const worker = queueManager.registerWorker(
				"notifications",
				async () => ({ success: true })
			);

			expect(worker).toBeDefined();
		});
	});

	describe("getJobCounts", () => {
		it("should return job counts for queue", async () => {
			await queueManager.connect(mockRedis);

			const counts = await queueManager.getJobCounts("notifications");

			expect(counts).toEqual({
				waiting: 5,
				active: 2,
				completed: 100,
				failed: 1,
				delayed: 3,
			});
		});
	});

	describe("pauseQueue / resumeQueue", () => {
		it("should pause and resume queue", async () => {
			await queueManager.connect(mockRedis);

			await queueManager.pauseQueue("notifications");
			await queueManager.resumeQueue("notifications");

			// No errors thrown means success
			expect(true).toBe(true);
		});
	});

	describe("cleanQueue", () => {
		it("should clean completed jobs", async () => {
			await queueManager.connect(mockRedis);

			const cleaned = await queueManager.cleanQueue(
				"notifications",
				60000,
				"completed"
			);

			expect(cleaned).toEqual(["job-1", "job-2"]);
		});
	});

	describe("getHealthStatus", () => {
		it("should return health status for all queues", async () => {
			await queueManager.connect(mockRedis);

			const health = await queueManager.getHealthStatus();

			expect(health.healthy).toBe(true);
			expect(health.queues).toBeDefined();
			expect(health.queues.notifications).toEqual({
				status: "ok",
				waiting: 5,
				active: 2,
				failed: 1,
			});
		});
	});

	describe("hasActiveJobs", () => {
		it("should return false when no workers registered", async () => {
			await queueManager.connect(mockRedis);

			expect(queueManager.hasActiveJobs()).toBe(false);
		});

		it("should return true when workers are running", async () => {
			await queueManager.connect(mockRedis);
			queueManager.registerWorker("notifications", async () => ({
				success: true,
			}));

			expect(queueManager.hasActiveJobs()).toBe(true);
		});
	});

	describe("drainWorkers", () => {
		it("should drain all workers gracefully", async () => {
			await queueManager.connect(mockRedis);
			queueManager.registerWorker("notifications", async () => ({
				success: true,
			}));

			await queueManager.drainWorkers(5000);

			// Should complete without timeout
			expect(true).toBe(true);
		});
	});

	describe("disconnect", () => {
		it("should close all workers and queues", async () => {
			await queueManager.connect(mockRedis);
			queueManager.registerWorker("notifications", async () => ({
				success: true,
			}));

			await queueManager.disconnect();

			// After disconnect, queues should not be accessible
			expect(() => queueManager.getQueue("notifications")).toThrow();
		});
	});
});

describe("Queue Configurations", () => {
	it("should have all expected queues configured", async () => {
		const queueManager = new QueueManager();
		await queueManager.connect(mockRedis);

		const expectedQueues: QueueName[] = [
			"ai:decomposition",
			"ai:suggestions",
			"notifications",
			"email",
			"digest",
			"integration:sync",
			"integration:webhooks",
			"maintenance",
			"analytics",
			"events:dlq",
		];

		for (const queueName of expectedQueues) {
			expect(() => queueManager.getQueue(queueName)).not.toThrow();
		}

		await queueManager.disconnect();
	});
});
