# Docker Compose Setup - Complete Summary

## Overview

Complete local development environment with Docker Compose for GrandPlan. All services configured with:
- Proper networking and service discovery
- Volume mounts for hot-reload development
- Health checks with automatic retry logic
- Environment variable configuration
- Development and production stages in Dockerfiles

## Files Created/Modified

### Core Docker Compose Files

#### docker-compose.yml
**Location**: `/Users/vivek/jet/grandplan/grandplan/docker-compose.yml`
**Size**: ~264 lines
**Purpose**: Main Docker Compose configuration for all services

**Key Features**:
- PostgreSQL 16 (port 5432) with persistent volumes
- Redis 7 (port 6379) with persistent volumes
- Node.js API/Server (port 3000) with hot-reload
- React/Vite Frontend (port 5173→3001) with HMR
- Background Worker (no public port)
- Dedicated `grandplan` bridge network (172.20.0.0/16)
- Health checks for all services
- Environment variable support with sensible defaults
- Volume mounts for hot-reload development

**Services Configuration**:
```yaml
- postgres: PostgreSQL 16-alpine with healthcheck
- redis: Redis 7-alpine with AOF persistence
- server: Node.js development with tsx watch
- web: Vite dev server with HMR
- worker: Background job processor
```

#### docker-compose.override.yml
**Location**: `/Users/vivek/jet/grandplan/grandplan/docker-compose.override.yml`
**Size**: ~117 lines
**Purpose**: Local development overrides (auto-loaded by Docker Compose)

**Key Features**:
- Development-specific settings for each service
- Shared pnpm cache volume
- Node modules volumes to avoid permission issues
- Less strict health checks for development
- Interactive terminal (stdin/tty) for debugging
- Environment variables for development (DEBUG, VITE_HMR_*)
- Graceful restart on failure (up to 5 retries)

### Environment Configuration

#### .env.local
**Location**: `/Users/vivek/jet/grandplan/grandplan/.env.local`
**Size**: ~94 lines
**Purpose**: Local development environment variables (created fresh for development)

**Sections**:
- Database (PostgreSQL) configuration
- Redis configuration
- Server/API configuration
- Web/Frontend configuration
- AI Providers (OpenAI, Anthropic)
- Stripe integration
- Email (SendGrid)
- Encryption keys
- OAuth integrations (Slack, Jira, Asana, Linear, Notion, Google, Microsoft)

### Documentation

#### DOCKER_DEV_GUIDE.md
**Location**: `/Users/vivek/jet/grandplan/grandplan/DOCKER_DEV_GUIDE.md`
**Size**: ~650 lines
**Purpose**: Comprehensive development guide with all details

**Sections**:
1. Quick Start - Basic commands
2. Architecture - Service diagram and network topology
3. Services Overview - Detailed info on each service
4. Environment Configuration - Variable management
5. Common Tasks - Logs, database, Redis, rebuild operations
6. Development Workflow - Initial setup, daily dev, testing, migrations
7. Health Checks - Monitoring service health
8. Port Mappings - Service-to-host port mapping
9. Networking - Service discovery and external access
10. Volumes - Data persistence configuration
11. Performance Tips - Optimization recommendations
12. Troubleshooting - Common issues and solutions
13. Docker Compose Versions - Version information
14. Advanced Configuration - Profiles, multi-file, dependencies
15. Resources - Links to documentation

#### DOCKER_QUICK_START.md
**Location**: `/Users/vivek/jet/grandplan/grandplan/DOCKER_QUICK_START.md`
**Size**: ~280 lines
**Purpose**: Quick reference guide for getting started

**Sections**:
1. Prerequisites - What you need
2. Installation - How to install Docker
3. Quick Start - 5-step setup
4. Common Commands - Helper script and docker-compose commands
5. Services - Quick reference table
6. Development Workflow - How to make code changes
7. Troubleshooting - Quick fixes
8. Environment Configuration - Setting up variables
9. System Requirements - Hardware specs
10. Tips - Performance optimization
11. Next Steps - Where to go from here

### Helper Scripts

#### docker-dev.sh
**Location**: `/Users/vivek/jet/grandplan/grandplan/docker-dev.sh`
**Size**: ~234 lines
**Purpose**: Convenient wrapper script for docker-compose commands

**Commands Available**:
- `up` / `up -d` - Start services
- `down` / `down -v` - Stop services
- `logs [service]` / `logs -f [service]` - View logs
- `shell <service>` - Interactive shell
- `migrate` - Run database migrations
- `build` / `rebuild <service>` - Build images
- `ps` / `status` - Show running containers
- `clean` - Remove everything

**Features**:
- Colored output for readability
- Input validation
- Error handling
- Helpful usage documentation
- Example commands

### Dockerfile Updates

#### apps/server/Dockerfile
**Location**: `/Users/vivek/jet/grandplan/grandplan/apps/server/Dockerfile`
**Changes**: Added development stage

**Stages**:
1. **development** - For local development with tsx watch hot-reload
2. **builder** - Compiles TypeScript to JavaScript
3. **runner** - Minimal production image

#### apps/web/Dockerfile
**Location**: `/Users/vivek/jet/grandplan/grandplan/apps/web/Dockerfile`
**Changes**: Added development stage

**Stages**:
1. **development** - Vite dev server with HMR (port 5173)
2. **builder** - Production build with optimization
3. **runner** - Nginx static file serving

#### apps/worker/Dockerfile
**Location**: `/Users/vivek/jet/grandplan/grandplan/apps/worker/Dockerfile`
**Changes**: Added development stage

**Stages**:
1. **development** - For local development with tsx watch hot-reload
2. **builder** - Compiles TypeScript to JavaScript
3. **runner** - Minimal production image

### Configuration Updates

#### .dockerignore
**Location**: `/Users/vivek/jet/grandplan/grandplan/.dockerignore`
**Changes**: Removed docker-compose.yml exclusion to allow access in build context

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Docker Compose Network (grandplan)       │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  PostgreSQL  │  │    Redis     │            │
│  │  (5432)      │  │  (6379)      │            │
│  └──────────────┘  └──────────────┘            │
│        ▲                   ▲                    │
│        │                   │                    │
│        └───────────┬───────┘                    │
│                    │                            │
│  ┌─────────────────────────────────┐          │
│  │    Node.js Server/API           │          │
│  │  - Port 3000 (Express)          │          │
│  │  - Hot reload via tsx watch     │          │
│  │  - Health check: /health        │          │
│  └─────────────────────────────────┘          │
│            ▲        ▲                          │
│            │        └──────────────┐           │
│            │                       │           │
│  ┌─────────────────────┐  ┌────────────────┐ │
│  │  React + Vite       │  │  Worker (BG)   │ │
│  │  - Port 5173 (HMR)  │  │  - No pub port │ │
│  │  - Port 3001 (host) │  │  - Hot reload  │ │
│  │  - Hot reload HMR   │  │  - BullMQ jobs │ │
│  └─────────────────────┘  └────────────────┘ │
│                                                │
└─────────────────────────────────────────────────┘
```

## Quick Reference

### Start Services
```bash
# Using helper script
./docker-dev.sh up

# Using docker-compose
docker-compose up

# Background
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
```

### Database Operations
```bash
# Migrations
docker-compose exec server pnpm migrate

# Database shell
docker-compose exec postgres psql -U postgres -d grandplan
```

### Rebuild
```bash
./docker-dev.sh rebuild server
docker-compose build --no-cache
```

### Stop
```bash
./docker-dev.sh down
docker-compose down -v  # Also remove volumes
```

## Service Details

### PostgreSQL
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Database**: grandplan
- **Credentials**: postgres/password
- **Data Path**: /var/lib/postgresql/data
- **Volume**: grandplan_postgres_data
- **Health Check**: pg_isready

### Redis
- **Image**: redis:7-alpine
- **Port**: 6379
- **Persistence**: AOF enabled
- **Volume**: grandplan_redis_data
- **Health Check**: redis-cli ping

### Server
- **Image**: Built from apps/server/Dockerfile (development stage)
- **Port**: 3000
- **Framework**: Express.js
- **Language**: TypeScript (tsx watch)
- **Hot Reload**: Yes
- **Health Check**: curl -f http://localhost:3000/health

### Web
- **Image**: Built from apps/web/Dockerfile (development stage)
- **Port**: 5173 (container) → 3001 (host)
- **Framework**: React 19 + Vite
- **Hot Module Reload**: Yes
- **Health Check**: wget http://localhost:5173

### Worker
- **Image**: Built from apps/worker/Dockerfile (development stage)
- **Ports**: None (internal only)
- **Framework**: Node.js + BullMQ
- **Language**: TypeScript (tsx watch)
- **Hot Reload**: Yes

## Environment Variables

### Database
```bash
DATABASE_URL=postgresql://postgres:password@postgres:5432/grandplan
REDIS_URL=redis://localhost:6379
POSTGRES_DB=grandplan
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

### Server
```bash
PORT=3000
NODE_ENV=development
BETTER_AUTH_SECRET=dev-secret-local-dev-only
CORS_ORIGIN=http://localhost:3001
APP_URL=http://localhost:3001
```

### Web
```bash
VITE_SERVER_URL=http://localhost:3000
VITE_HMR_HOST=localhost
VITE_HMR_PORT=5173
VITE_HMR_PROTOCOL=ws
```

## Health Checks

All services have health checks configured:

| Service | Check | Interval | Timeout | Retries | Start Period |
|---------|-------|----------|---------|---------|--------------|
| PostgreSQL | pg_isready | 10s | 5s | 5 | 10s |
| Redis | redis-cli ping | 10s | 5s | 5 | 10s |
| Server | curl /health | 30s | 10s | 3 | 40s |
| Web | wget localhost:5173 | 30s | 10s | 3 | 30s |

## Networking

- **Network Driver**: bridge
- **Network Name**: grandplan
- **Subnet**: 172.20.0.0/16
- **Service Discovery**: Services accessible by name (postgres:5432, redis:6379, etc.)

## Volumes

| Name | Path | Purpose | Type |
|------|------|---------|------|
| grandplan_postgres_data | /var/lib/postgresql/data | PostgreSQL persistence | Local |
| grandplan_redis_data | /data | Redis persistence | Local |
| ./apps/server/src | /app/apps/server/src | Server hot-reload | Bind |
| ./apps/web/src | /app/apps/web/src | Web hot-reload | Bind |
| ./packages | /app/packages | Shared packages | Bind |

## Performance Considerations

### Memory Usage
- Typical usage: 2-3GB RAM
- Minimum: 2GB
- Recommended: 4GB+

### Disk Space
- Initial setup: ~5GB
- PostgreSQL data: Variable (typically <1GB in dev)
- Docker images: ~1GB
- node_modules: ~3GB

### Optimization Tips
1. Increase Docker Desktop memory allocation (6GB recommended)
2. Use named volumes for node_modules to avoid permission issues
3. Enable BuildKit for faster builds
4. Use `.dockerignore` to exclude unnecessary files
5. Keep pnpm-lock.yaml in sync

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process: `lsof -i :3000; kill -9 <PID>` |
| Database won't connect | Check health: `docker-compose exec postgres pg_isready` |
| Hot reload not working | Restart service: `docker-compose restart server` |
| Out of memory | Increase Docker Desktop memory limit |
| Permissions error | Use named volumes: `docker-compose exec -u root` |
| Slow builds | Enable BuildKit: `DOCKER_BUILDKIT=1` |

## Next Steps

1. Read [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md) - Get up and running quickly
2. Read [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md) - Comprehensive reference
3. Run `./docker-dev.sh up` or `docker-compose up`
4. Start developing!

## Support Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| docker-compose.yml | 264 | Main compose config |
| docker-compose.override.yml | 117 | Dev overrides |
| .env.local | 94 | Local env variables |
| docker-dev.sh | 234 | Helper script |
| DOCKER_DEV_GUIDE.md | 650 | Comprehensive guide |
| DOCKER_QUICK_START.md | 280 | Quick reference |
| apps/server/Dockerfile | 96 | Server image config |
| apps/web/Dockerfile | 78 | Web image config |
| apps/worker/Dockerfile | 86 | Worker image config |
| .dockerignore | 54 | Docker build exclusions |
| **TOTAL** | **2,353** | **Complete setup** |

---

**Setup completed successfully!** Ready for local development with Docker Compose.
