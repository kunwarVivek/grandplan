# Docker Compose Development Guide

Complete guide for local development with Docker Compose.

## Quick Start

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Follow logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   PostgreSQL │  │    Redis     │  │   Node.js API    │  │
│  │  (port 5432) │  │ (port 6379)  │  │  (port 3000)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         ▲                 ▲                    ▲             │
│         └─────────────────┴────────────────────┘             │
│                                                               │
│                    grandplan network                         │
│                  (172.20.0.0/16 subnet)                      │
│                                                               │
│  ┌──────────────────┐            ┌──────────────────┐      │
│  │  React Frontend  │            │  Worker (BG)     │      │
│  │  Vite Dev Server │            │  (no public port)│      │
│  │  (port 5173)     │            │                  │      │
│  └──────────────────┘            └──────────────────┘      │
│         ▲                               ▲                   │
│         └───────────────────────────────┘                   │
│                                                               │
│  Exposed Ports:                                              │
│  - 5432 (PostgreSQL)                                        │
│  - 6379 (Redis)                                             │
│  - 3000 (Server/API)                                        │
│  - 5173 (Web/Vite Dev Server)                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Services Overview

### PostgreSQL (postgres)
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Database**: grandplan
- **User**: postgres
- **Password**: password (override in .env.local)
- **Volume**: grandplan_postgres_data
- **Health Check**: pg_isready

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d grandplan

# Run migrations
docker-compose exec server pnpm migrate
```

### Redis (redis)
- **Image**: redis:7-alpine
- **Port**: 6379
- **AOF Persistence**: Enabled
- **Volume**: grandplan_redis_data
- **Health Check**: redis-cli ping

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis commands
docker-compose exec redis redis-cli monitor
```

### Server (Node.js API)
- **Port**: 3000
- **Framework**: Express.js
- **Hot Reload**: Enabled via tsx watch
- **Health Check**: GET /health
- **Entrypoint**: apps/server/Dockerfile

```bash
# View server logs
docker-compose logs -f server

# Execute command in server
docker-compose exec server pnpm build

# Interactive shell
docker-compose exec -it server bash
```

### Web (React Frontend)
- **Port**: 5173 (Vite dev server)
- **Port**: 3001 (exposed to host)
- **Framework**: React 19 + TanStack Router
- **Build Tool**: Vite
- **Hot Module Reload**: Enabled
- **Entrypoint**: apps/web/Dockerfile

```bash
# View web logs
docker-compose logs -f web

# Access in browser
open http://localhost:3001
```

### Worker (Background Jobs)
- **No Public Port**: Internal only
- **Framework**: Node.js with BullMQ
- **Dependencies**: PostgreSQL, Redis
- **Entrypoint**: apps/worker/Dockerfile

```bash
# View worker logs
docker-compose logs -f worker

# Check worker status
docker-compose exec worker pnpm dev
```

## Environment Configuration

### Load Order
1. docker-compose.yml (defaults)
2. .env.local (if exists, overrides defaults)
3. Command-line arguments (override everything)

### Required Variables

#### Database
```bash
DATABASE_URL=postgresql://postgres:password@postgres:5432/grandplan
REDIS_URL=redis://localhost:6379
```

#### Server
```bash
PORT=3000
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
APP_URL=http://localhost:3001
```

#### Web
```bash
VITE_SERVER_URL=http://localhost:3000
```

### Optional Variables

See `.env.local` for all available options including:
- AI Providers (OpenAI, Anthropic)
- Stripe Integration
- SendGrid Email
- OAuth Integrations (Slack, Jira, Linear, etc.)

## Common Tasks

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs server

# Follow logs
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100

# With timestamps
docker-compose logs --timestamps
```

### Execute Commands

```bash
# Run command in container
docker-compose exec server pnpm build

# Interactive shell
docker-compose exec -it server bash

# Run as specific user
docker-compose exec -u root server apt-get update
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d grandplan

# Dump database
docker-compose exec postgres pg_dump -U postgres grandplan > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres grandplan < backup.sql

# Drop all tables
docker-compose exec postgres psql -U postgres -d grandplan -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor all commands
docker-compose exec redis redis-cli monitor

# Clear all data
docker-compose exec redis redis-cli FLUSHALL

# Check memory usage
docker-compose exec redis redis-cli INFO memory
```

### Rebuild Services

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build server

# Rebuild without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Remove everything
docker-compose down -v --rmi all

# Prune unused Docker resources
docker system prune -a
```

## Development Workflow

### Initial Setup

```bash
# 1. Clone the repository
git clone <repo>
cd grandplan

# 2. Create local env file
cp .env.local .env.local

# 3. Start services
docker-compose up -d

# 4. Wait for services to be healthy
docker-compose ps

# 5. Run migrations
docker-compose exec server pnpm migrate

# 6. Access the app
open http://localhost:3001
```

### Daily Development

```bash
# Start services
docker-compose up

# In another terminal, follow logs
docker-compose logs -f

# Code changes are automatically reloaded:
# - Server: tsx watch (hot reload)
# - Web: Vite HMR (hot reload)
# - Worker: tsx watch (requires manual restart for some changes)
```

### Testing

```bash
# Run tests in server
docker-compose exec server pnpm test

# Run tests in web
docker-compose exec web pnpm test

# Run tests in worker
docker-compose exec worker pnpm test

# Run all tests
docker-compose exec server pnpm test:all
```

### Database Migrations

```bash
# Create migration
docker-compose exec server pnpm prisma migrate dev --name my_migration

# Apply migrations
docker-compose exec server pnpm migrate

# Reset database
docker-compose exec server pnpm prisma migrate reset
```

## Health Checks

Each service has a health check configured:

```bash
# View health status
docker-compose ps

# Check specific service
docker-compose exec postgres pg_isready -U postgres

# Manual health check
curl -f http://localhost:3000/health
wget -q -O - http://localhost:5173
```

## Port Mappings

| Service | Container Port | Host Port | Protocol |
|---------|----------------|-----------|----------|
| PostgreSQL | 5432 | 5432 | TCP |
| Redis | 6379 | 6379 | TCP |
| Server API | 3000 | 3000 | HTTP |
| Web (Vite) | 5173 | 5173 | HTTP/WS |
| Web (mapped) | - | 3001 | HTTP |

## Networking

All services are connected via the `grandplan` bridge network.

### Service Discovery
Services can communicate using their service names:
- `postgres:5432`
- `redis:6379`
- `server:3000`
- `web:5173`

### External Access
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Server: localhost:3000
- Web: localhost:3001 (mapped from 5173)

## Volumes

| Volume | Path | Purpose |
|--------|------|---------|
| grandplan_postgres_data | /var/lib/postgresql/data | PostgreSQL data persistence |
| grandplan_redis_data | /data | Redis data persistence |
| ./apps/server/src | /app/apps/server/src | Server source hot reload |
| ./apps/web/src | /app/apps/web/src | Web source hot reload |
| ./apps/worker/src | /app/apps/worker/src | Worker source hot reload |
| ./packages | /app/packages | Shared packages |

## Performance Tips

### Reduce Build Time
```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Use layer caching
docker-compose up -d --build  # Uses cache if available
```

### Reduce Memory Usage
```bash
# Stop unused services
docker-compose stop web  # Keep API and DB running

# Limit memory (in docker-compose.override.yml)
services:
  server:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Improve Hot Reload
```bash
# Watch file system changes
docker-compose logs -f server

# File watcher settings for tsx
# Increase inotify limits on macOS (Docker Desktop)
# Already optimized by default on recent versions
```

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker-compose logs server

# Rebuild image
docker-compose build --no-cache server

# Remove container and retry
docker-compose rm -f server
docker-compose up server
```

### Port already in use

```bash
# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in .env.local
SERVER_PORT=3001
```

### Database connection failed

```bash
# Check if postgres is healthy
docker-compose exec postgres pg_isready -U postgres

# Check logs
docker-compose logs postgres

# Reset database
docker-compose down -v  # Remove volumes
docker-compose up postgres
```

### Redis connection failed

```bash
# Check redis health
docker-compose exec redis redis-cli ping

# Check logs
docker-compose logs redis

# Clear Redis data
docker-compose exec redis redis-cli FLUSHALL
```

### Hot reload not working

```bash
# Ensure volume mounts are correct
docker-compose config | grep -A 5 volumes:

# Restart service
docker-compose restart server

# Check file permissions
ls -la apps/server/src
```

## Docker Compose Versions

- **Compose v2** (default): `docker-compose` command
- **Compose v1**: `docker-compose` (legacy)

To check version:
```bash
docker-compose --version

# Update to latest
docker-compose pull
```

## Advanced Configuration

### Use Compose Profiles

```bash
# Start only api services
docker-compose --profile api up

# Define in docker-compose.yml
services:
  server:
    profiles:
      - api
```

### Multi-File Compose

```bash
# Use multiple compose files
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Service Dependencies

```bash
# Wait for healthcheck (already configured)
depends_on:
  postgres:
    condition: service_healthy
```

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Vite HMR Documentation](https://vitejs.dev/guide/ssr.html#setting-up-the-dev-server)

## Support

For issues or questions:
1. Check the troubleshooting section
2. View service logs: `docker-compose logs -f <service>`
3. Check Docker Desktop dashboard
4. Review docker-compose.yml configuration
