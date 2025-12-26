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

# Copy the web app
COPY apps/web ./apps/web

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build arguments for environment variables
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Build the web app
RUN pnpm --filter web build

# Production stage - using nginx to serve static files
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port 3001
EXPOSE 3001

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
