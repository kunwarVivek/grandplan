# ============================================================================
# Development Stage - Vite dev server with HMR for local development
# ============================================================================
FROM node:22-alpine AS development

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# Copy all packages (shared dependencies)
COPY packages ./packages

# Copy the web app
COPY apps/web ./apps/web

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server with HMR
CMD ["pnpm", "--filter", "web", "dev", "--host", "0.0.0.0"]

# ============================================================================
# Builder Stage - Builds optimized production assets
# ============================================================================
FROM node:22-alpine AS builder

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# Copy all packages (shared dependencies)
COPY packages ./packages

# Copy the web app
COPY apps/web ./apps/web

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build arguments for environment variables
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Build the web app
RUN pnpm --filter web build

# ============================================================================
# Production Stage - Minimal nginx image to serve static assets
# ============================================================================
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:80/ || exit 1

# Expose port for web server
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
