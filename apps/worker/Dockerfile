# ============================================================================
# Development Stage - For local development with hot reload
# ============================================================================
FROM node:22-alpine AS development

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# Copy all packages (shared dependencies)
COPY packages ./packages

# Copy the worker app
COPY apps/worker ./apps/worker

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @grandplan/db db:generate

# Start with tsx for hot reload in development
CMD ["pnpm", "--filter", "@grandplan/worker", "dev"]

# ============================================================================
# Builder Stage - Compiles TypeScript to JavaScript
# ============================================================================
FROM node:22-alpine AS builder

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# Copy all packages (shared dependencies)
COPY packages ./packages

# Copy the worker app
COPY apps/worker ./apps/worker

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @grandplan/db db:generate

# Build the worker
RUN pnpm --filter @grandplan/worker build

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM node:22-alpine AS runner

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace configuration
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy packages (required for workspace dependencies)
COPY --from=builder /app/packages ./packages

# Copy worker package.json and built dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter @grandplan/worker...

# Start the worker
CMD ["node", "apps/worker/dist/index.js"]
