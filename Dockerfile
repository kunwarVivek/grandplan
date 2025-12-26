# Base image for shared build dependencies
# This can be used as a base for building any app in the monorepo
FROM node:22-alpine AS base

# Install common build dependencies
RUN apk add --no-cache libc6-compat

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Dependencies stage - installs all dependencies
FROM base AS deps

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all package.json files for dependency resolution
COPY packages ./packages
COPY apps ./apps

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Builder stage - builds all packages
FROM deps AS builder

# Build all packages
RUN pnpm build

# Development stage - for local development with hot reload
FROM deps AS development

ENV NODE_ENV=development

# Expose common ports
EXPOSE 3000 5173

# Default command for development
CMD ["pnpm", "dev"]
