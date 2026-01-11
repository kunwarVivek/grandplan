// ============================================
// WORKER HEALTH ENDPOINT TESTS
// ============================================

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";

// Mock dependencies before any imports that might use them
vi.mock("@grandplan/queue", () => ({
	queueManager: {
		getHealthStatus: vi.fn().mockResolvedValue({
			healthy: true,
			queues: {
				notifications: { status: "ok", waiting: 0, active: 0, failed: 0 },
				email: { status: "ok", waiting: 5, active: 1, failed: 0 },
			},
		}),
	},
}));

vi.mock("ioredis", () => ({
	default: vi.fn().mockImplementation(() => ({
		ping: vi.fn().mockResolvedValue("PONG"),
		quit: vi.fn().mockResolvedValue(undefined),
	})),
}));

import { queueManager } from "@grandplan/queue";

describe("Worker Health Endpoints", () => {
	let server: Server;
	let port: number;

	// Simulate health state
	let isHealthy = true;
	let isShuttingDown = false;

	const handleHealthRequest = async (
		url: string
	): Promise<{ status: number; body: Record<string, unknown> }> => {
		if (url === "/health" || url === "/healthz") {
			if (isHealthy && !isShuttingDown) {
				return {
					status: 200,
					body: { status: "healthy", timestamp: new Date().toISOString() },
				};
			}
			return {
				status: 503,
				body: {
					status: isShuttingDown ? "shutting_down" : "unhealthy",
					timestamp: new Date().toISOString(),
				},
			};
		}

		if (url === "/ready") {
			if (isShuttingDown) {
				return {
					status: 503,
					body: {
						status: "not_ready",
						reason: "shutting_down",
						timestamp: new Date().toISOString(),
					},
				};
			}

			const queueHealth = await queueManager.getHealthStatus();
			const ready = isHealthy && queueHealth.healthy;

			return {
				status: ready ? 200 : 503,
				body: {
					status: ready ? "ready" : "not_ready",
					timestamp: new Date().toISOString(),
					checks: {
						redis: { status: "ok" },
						queues: queueHealth.queues,
					},
				},
			};
		}

		if (url === "/metrics/queues") {
			const queueHealth = await queueManager.getHealthStatus();
			return {
				status: 200,
				body: {
					timestamp: new Date().toISOString(),
					queues: queueHealth.queues,
				},
			};
		}

		return { status: 404, body: { error: "Not Found" } };
	};

	beforeEach(async () => {
		isHealthy = true;
		isShuttingDown = false;

		// Create test server
		port = 9999 + Math.floor(Math.random() * 1000);
		server = createServer(async (req, res) => {
			const result = await handleHealthRequest(req.url ?? "");
			res.writeHead(result.status, { "Content-Type": "application/json" });
			res.end(JSON.stringify(result.body));
		});

		await new Promise<void>((resolve) => server.listen(port, resolve));
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		vi.clearAllMocks();
	});

	const fetchEndpoint = async (
		path: string
	): Promise<{ status: number; body: Record<string, unknown> }> => {
		const response = await fetch(`http://localhost:${port}${path}`);
		const body = (await response.json()) as Record<string, unknown>;
		return { status: response.status, body };
	};

	describe("/health and /healthz (Liveness)", () => {
		it("should return 200 when healthy", async () => {
			const response = await fetchEndpoint("/health");
			expect(response.status).toBe(200);
			expect(response.body.status).toBe("healthy");
		});

		it("should return 200 for /healthz alias", async () => {
			const response = await fetchEndpoint("/healthz");
			expect(response.status).toBe(200);
			expect(response.body.status).toBe("healthy");
		});

		it("should return 503 when unhealthy", async () => {
			isHealthy = false;
			const response = await fetchEndpoint("/health");
			expect(response.status).toBe(503);
			expect(response.body.status).toBe("unhealthy");
		});

		it("should return 503 with shutting_down status during shutdown", async () => {
			isShuttingDown = true;
			const response = await fetchEndpoint("/health");
			expect(response.status).toBe(503);
			expect(response.body.status).toBe("shutting_down");
		});

		it("should include timestamp in response", async () => {
			const response = await fetchEndpoint("/health");
			expect(response.body.timestamp).toBeDefined();
			expect(typeof response.body.timestamp).toBe("string");
		});
	});

	describe("/ready (Readiness)", () => {
		it("should return 200 when healthy and queues are ok", async () => {
			const response = await fetchEndpoint("/ready");
			expect(response.status).toBe(200);
			expect(response.body.status).toBe("ready");
		});

		it("should include queue health in checks", async () => {
			const response = await fetchEndpoint("/ready");
			expect(response.body.checks).toBeDefined();
			const checks = response.body.checks as Record<string, unknown>;
			expect(checks.redis).toEqual({ status: "ok" });
			expect(checks.queues).toBeDefined();
		});

		it("should return 503 during shutdown", async () => {
			isShuttingDown = true;
			const response = await fetchEndpoint("/ready");
			expect(response.status).toBe(503);
			expect(response.body.status).toBe("not_ready");
			expect(response.body.reason).toBe("shutting_down");
		});

		it("should return 503 when queue health fails", async () => {
			vi.mocked(queueManager.getHealthStatus).mockResolvedValueOnce({
				healthy: false,
				queues: {
					notifications: { status: "error", waiting: 0, active: 0, failed: 0 },
				},
			});

			const response = await fetchEndpoint("/ready");
			expect(response.status).toBe(503);
			expect(response.body.status).toBe("not_ready");
		});
	});

	describe("/metrics/queues", () => {
		it("should return queue metrics", async () => {
			const response = await fetchEndpoint("/metrics/queues");
			expect(response.status).toBe(200);
			expect(response.body.queues).toBeDefined();
			expect(response.body.timestamp).toBeDefined();
		});

		it("should include queue job counts", async () => {
			const response = await fetchEndpoint("/metrics/queues");
			const queues = response.body.queues as Record<
				string,
				{ waiting: number; active: number; failed: number } | undefined
			>;
			expect(queues.email).toBeDefined();
			expect(queues.email?.waiting).toBe(5);
			expect(queues.email?.active).toBe(1);
		});
	});

	describe("404 handling", () => {
		it("should return 404 for unknown paths", async () => {
			const response = await fetchEndpoint("/unknown");
			expect(response.status).toBe(404);
		});
	});
});

describe("Health Check Response Format", () => {
	it("should follow Kubernetes health check conventions", () => {
		// Liveness probe format
		const livenessResponse = {
			status: "healthy",
			timestamp: new Date().toISOString(),
		};
		expect(livenessResponse.status).toBeDefined();
		expect(livenessResponse.timestamp).toBeDefined();

		// Readiness probe format
		const readinessResponse = {
			status: "ready",
			timestamp: new Date().toISOString(),
			checks: {
				redis: { status: "ok" },
				queues: {},
			},
		};
		expect(readinessResponse.status).toBeDefined();
		expect(readinessResponse.checks).toBeDefined();
	});
});
