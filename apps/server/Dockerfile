# Build stage
FROM node:22-alpine AS builder

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.json ./

# Copy all packages (shared dependencies)
COPY packages ./packages

# Copy the server app
COPY apps/server ./apps/server

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @grandplan/db db:generate

# Build the server
RUN pnpm --filter server build

# Production stage
FROM node:22-alpine AS runner

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy workspace configuration
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy packages (required for workspace dependencies)
COPY --from=builder /app/packages ./packages

# Copy server package.json and built dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter server...

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["node", "apps/server/dist/index.js"]
