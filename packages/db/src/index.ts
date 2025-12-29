import { env } from "@grandplan/env/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { Prisma, PrismaClient } from "../prisma/generated/client";

// Configure connection pool for production
const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 20, // Maximum number of connections
	idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
	connectionTimeoutMillis: 2000, // Wait 2 seconds for connection
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Export prisma instance (default for convenience)
export default prisma;

// Named export for explicit usage
export { prisma, prisma as db };

// Re-export Prisma types and utilities
export { Prisma };
export * from "../prisma/generated/client";

// Transaction helper
export const withTransaction = async <T>(
	fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
	return prisma.$transaction(fn);
};

// Graceful shutdown helper
export const disconnect = async (): Promise<void> => {
	await prisma.$disconnect();
	await pool.end();
};
