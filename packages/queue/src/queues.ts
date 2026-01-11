// ============================================
// QUEUE DEFINITIONS
// ============================================

import type { QueueName } from "./types.js";

export interface QueueConfig {
	name: QueueName;
	defaultJobOptions: {
		attempts: number;
		backoff: {
			type: "exponential" | "fixed";
			delay: number;
		};
		removeOnComplete: boolean | { count: number };
		removeOnFail: boolean | { count: number };
	};
	rateLimiter?: {
		max: number;
		duration: number;
	};
}

export const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
	"ai:decomposition": {
		name: "ai:decomposition",
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 5000 },
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 500 },
		},
		rateLimiter: {
			max: 10,
			duration: 60000, // 10 per minute
		},
	},

	"ai:suggestions": {
		name: "ai:suggestions",
		defaultJobOptions: {
			attempts: 2,
			backoff: { type: "fixed", delay: 3000 },
			removeOnComplete: { count: 50 },
			removeOnFail: { count: 200 },
		},
		rateLimiter: {
			max: 20,
			duration: 60000,
		},
	},

	notifications: {
		name: "notifications",
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 500 },
		},
	},

	email: {
		name: "email",
		defaultJobOptions: {
			attempts: 5,
			backoff: { type: "exponential", delay: 2000 },
			removeOnComplete: { count: 500 },
			removeOnFail: { count: 1000 },
		},
		rateLimiter: {
			max: 100,
			duration: 60000, // 100 emails per minute
		},
	},

	digest: {
		name: "digest",
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "fixed", delay: 60000 },
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 100 },
		},
	},

	"integration:sync": {
		name: "integration:sync",
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 5000 },
			removeOnComplete: { count: 200 },
			removeOnFail: { count: 500 },
		},
		rateLimiter: {
			max: 30,
			duration: 60000,
		},
	},

	"integration:webhooks": {
		name: "integration:webhooks",
		defaultJobOptions: {
			attempts: 5,
			backoff: { type: "exponential", delay: 1000 },
			removeOnComplete: { count: 500 },
			removeOnFail: { count: 1000 },
		},
	},

	maintenance: {
		name: "maintenance",
		defaultJobOptions: {
			attempts: 2,
			backoff: { type: "fixed", delay: 30000 },
			removeOnComplete: true,
			removeOnFail: { count: 50 },
		},
	},

	analytics: {
		name: "analytics",
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 10000 },
			removeOnComplete: true,
			removeOnFail: { count: 100 },
		},
	},

	"events:dlq": {
		name: "events:dlq",
		defaultJobOptions: {
			attempts: 1,
			backoff: { type: "fixed", delay: 0 },
			removeOnComplete: false,
			removeOnFail: false,
		},
	},
};
