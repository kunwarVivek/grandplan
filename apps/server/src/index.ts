import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auth } from "@grandplan/auth";
import { db } from "@grandplan/db";
import { env } from "@grandplan/env/server";
import { realtimeServer } from "@grandplan/realtime";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import Redis from "ioredis";
import * as swaggerUi from "swagger-ui-express";
import * as YAML from "yamljs";

// Import middleware
import {
	authMiddleware,
	closeRateLimiter,
	errorHandler,
	notFoundHandler,
	requestIdMiddleware,
	standardRateLimit,
	tenantMiddleware,
} from "./middleware/index.js";

// Import module routes
import {
	adminRoutes,
	aiRoutes,
	billingRoutes,
	integrationRoutes,
	notificationRoutes,
	organizationRoutes,
	platformRoutes,
	projectRoutes,
	registerProjectEventHandlers,
	registerTaskEventHandlers,
	taskRoutes,
	teamRoutes,
	uploadRoutes,
	webhookRoutes,
	workspaceRoutes,
} from "./modules/index.js";

const app = express();

// Lazy Redis client for health checks
let redis: Redis | null = null;
function getRedis(): Redis {
	if (!redis) {
		redis = new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 1,
			enableReadyCheck: false,
		});
	}
	return redis;
}

// Request ID middleware - must be first for consistent tracing
app.use(requestIdMiddleware());

// CORS configuration
const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
	cors({
		origin: corsOrigins,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-User-Id",
			"X-Organization-Id",
			"X-Request-Id",
		],
		exposedHeaders: ["X-Request-Id"],
		credentials: true,
	}),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.resolve(process.cwd(), uploadsDir)));

// API Documentation with Swagger UI
try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const openapiPath = path.resolve(__dirname, "../../openapi.yaml");
	const swaggerDocument = YAML.load(openapiPath);

	app.use(
		"/api/docs",
		swaggerUi.serve,
		swaggerUi.setup(swaggerDocument, {
			customCss: ".swagger-ui .topbar { display: none }",
			customSiteTitle: "GrandPlan API Documentation",
		}),
	);
	console.log("API documentation available at /api/docs");
} catch (error) {
	console.warn("Could not load OpenAPI spec for Swagger UI:", error);
}

// Health check endpoints (before auth middleware)
app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

// Basic health check - just confirms server is running
app.get("/health", (_req, res) => {
	res
		.status(200)
		.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Readiness check - verifies all dependencies are available
app.get("/ready", async (_req, res) => {
	const checks: Record<string, { status: string; latency?: number }> = {};
	let isReady = true;

	// Check database
	const dbStart = Date.now();
	try {
		await db.$queryRaw`SELECT 1`;
		checks.database = { status: "ok", latency: Date.now() - dbStart };
	} catch {
		checks.database = { status: "error" };
		isReady = false;
	}

	// Check Redis
	const redisStart = Date.now();
	try {
		const client = getRedis();
		await client.ping();
		checks.redis = { status: "ok", latency: Date.now() - redisStart };
	} catch {
		checks.redis = { status: "error" };
		isReady = false;
	}

	res.status(isReady ? 200 : 503).json({
		status: isReady ? "ready" : "not_ready",
		timestamp: new Date().toISOString(),
		checks,
	});
});

// Auth routes (handled by better-auth)
app.all("/api/auth{/*path}", toNodeHandler(auth));

// Webhook routes - no auth, but have signature verification
app.use("/api/webhooks", webhookRoutes);

// Apply auth middleware for protected API routes
app.use("/api", authMiddleware);

// Apply tenant middleware for all API routes
app.use("/api", tenantMiddleware);

// Apply standard rate limiting to all API routes
app.use("/api", standardRateLimit);

// Register module routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);

// 404 handler for API routes
app.use("/api", notFoundHandler);

// Global error handler
app.use(errorHandler);

// Register event handlers for cross-module communication
registerTaskEventHandlers();
registerProjectEventHandlers();

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

const port = process.env.PORT ?? 3001;
httpServer.listen(port, async () => {
	console.log(`Server is running on port ${port}`);
	console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

	// Initialize realtime server with Socket.io
	try {
		await realtimeServer.initialize(httpServer, {
			redisUrl: env.REDIS_URL,
			corsOrigin: corsOrigins,
			authHandler: async (token: string) => {
				// Validate session using better-auth
				try {
					const session = await auth.api.getSession({
						headers: new Headers({ authorization: `Bearer ${token}` }),
					});
					if (!session?.user) return null;

					return {
						userId: session.user.id,
						organizationId:
							(session.user as { organizationId?: string }).organizationId ??
							"",
						name: session.user.name ?? undefined,
						avatar: session.user.image ?? undefined,
					};
				} catch {
					return null;
				}
			},
		});
		console.log("Realtime server initialized");
	} catch (error) {
		console.error("Failed to initialize realtime server:", error);
	}
});

// Graceful shutdown
async function shutdown(signal: string) {
	console.log(`Received ${signal}. Shutting down gracefully...`);

	httpServer.close(async () => {
		console.log("HTTP server closed");

		// Close realtime server
		await realtimeServer.shutdown();
		console.log("Realtime server closed");

		// Close Redis connections
		await closeRateLimiter();
		if (redis) {
			await redis.quit();
		}

		// Close database connection
		await db.$disconnect();

		console.log("All connections closed");
		process.exit(0);
	});

	// Force shutdown after 30 seconds
	setTimeout(() => {
		console.error("Forced shutdown after timeout");
		process.exit(1);
	}, 30000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
