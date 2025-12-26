import { auth } from "@grandplan/auth";
import { env } from "@grandplan/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

// Import middleware
import {
	errorHandler,
	notFoundHandler,
	tenantMiddleware,
} from "./middleware/index.js";

// Import module routes
import {
	organizationRoutes,
	projectRoutes,
	registerTaskEventHandlers,
	taskRoutes,
	teamRoutes,
	workspaceRoutes,
} from "./modules/index.js";

const app = express();

// CORS configuration
app.use(
	cors({
		origin: env.CORS_ORIGIN,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-User-Id",
			"X-Organization-Id",
		],
		credentials: true,
	}),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (before auth middleware)
app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
	res
		.status(200)
		.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Auth routes (handled by better-auth)
app.all("/api/auth{/*path}", toNodeHandler(auth));

// Apply tenant middleware for all API routes (except auth)
app.use("/api", tenantMiddleware);

// Register module routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/teams", teamRoutes);

// 404 handler for API routes
app.use("/api", notFoundHandler);

// Global error handler
app.use(errorHandler);

// Register event handlers for cross-module communication
registerTaskEventHandlers();

const port = env.PORT;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
	console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
