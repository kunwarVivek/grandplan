# Docker Compose - Local Development Setup

Complete local development environment for GrandPlan running in Docker Compose.

## Getting Started in 3 Steps

### 1. Start Services
```bash
./docker-dev.sh up
# or: docker-compose up
```

### 2. Wait for Services to be Healthy
```bash
docker-compose ps
# All services should show "healthy" or "running"
```

### 3. Access the Application
```bash
# Open in browser
open http://localhost:3001

# Or view in terminal
curl http://localhost:3001
```

That's it! The complete development environment is running.

## What's Running

| Service | Port | Purpose | Tech |
|---------|------|---------|------|
| **PostgreSQL** | 5432 | Database | postgres:16-alpine |
| **Redis** | 6379 | Cache & Queue | redis:7-alpine |
| **Server** | 3000 | REST API | Node.js + Express |
| **Web** | 3001 | Frontend App | React + Vite |
| **Worker** | Internal | Background Jobs | Node.js + BullMQ |

## Documentation

Start here based on your needs:

### Quick Start (5 minutes)
→ [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)
- Prerequisites and installation
- 5-step quick start guide
- Common commands reference
- Basic troubleshooting

### Complete Development Guide (30 minutes)
→ [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md)
- Comprehensive service documentation
- Development workflow
- Database operations
- Performance optimization
- Advanced troubleshooting
- Health checks and monitoring

### Setup Validation & Troubleshooting
→ [DOCKER_VALIDATION.md](./DOCKER_VALIDATION.md)
- Pre-flight checks
- Configuration validation
- Startup verification
- Success criteria checklist
- Advanced validation

### Technical Setup Overview
→ [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md)
- Complete file inventory
- Architecture details
- Service configuration
- Network and volumes
- File summary

## Core Files

### Docker Compose Configuration
- **docker-compose.yml** - Main configuration (PostgreSQL, Redis, Server, Web, Worker)
- **docker-compose.override.yml** - Local development overrides (auto-loaded)
- **.env.local** - Environment variables for your machine

### Helper Script
- **docker-dev.sh** - Convenient wrapper for docker-compose commands

### Documentation
- **DOCKER_QUICK_START.md** - Quick reference
- **DOCKER_DEV_GUIDE.md** - Comprehensive guide
- **DOCKER_VALIDATION.md** - Validation checklist
- **DOCKER_SETUP_SUMMARY.md** - Technical overview
- **README_DOCKER.md** - This file

## Quick Commands

### Using Helper Script (Recommended)
```bash
./docker-dev.sh up              # Start all services
./docker-dev.sh down            # Stop all services
./docker-dev.sh logs -f server  # Follow server logs
./docker-dev.sh shell server    # Interactive shell in server
./docker-dev.sh migrate         # Run database migrations
./docker-dev.sh rebuild server  # Rebuild server image
```

### Using Docker Compose Directly
```bash
docker-compose up               # Start all services
docker-compose ps               # Show status
docker-compose logs -f          # Follow all logs
docker-compose exec server bash # Shell in container
docker-compose down             # Stop all services
docker-compose down -v          # Also remove volumes
```

## Development Workflow

### Code Changes Auto-Reload
Edit files and they automatically reload:
- **Server** (`apps/server/src/`) - Reloads via tsx watch
- **Web** (`apps/web/src/`) - Reloads via Vite HMR
- **Worker** (`apps/worker/src/`) - Requires restart
- **Packages** (`packages/*/`) - Server/Web reload automatically

### Database Migrations
```bash
# Create migration
docker-compose exec server pnpm prisma migrate dev --name feature_name

# Apply migrations
docker-compose exec server pnpm migrate

# Reset database (deletes all data)
docker-compose exec server pnpm prisma migrate reset
```

### Running Tests
```bash
docker-compose exec server pnpm test   # Server tests
docker-compose exec web pnpm test      # Web tests
pnpm test                              # All tests
```

### Database Access
```bash
# PostgreSQL
docker-compose exec postgres psql -U postgres -d grandplan

# Redis
docker-compose exec redis redis-cli
```

## Architecture Overview

```
docker-compose.yml (main config)
    ├── docker-compose.override.yml (dev overrides)
    └── .env.local (local variables)

Services:
    ├── postgres (PostgreSQL 16)
    ├── redis (Redis 7)
    ├── server (Node.js API)
    ├── web (React Frontend)
    └── worker (Background Jobs)

Network: grandplan (172.20.0.0/16)
Volume Mounts: Source code for hot-reload
Health Checks: All services monitored
```

## Environment Configuration

Create `.env.local` with your settings:

```bash
# Database
POSTGRES_DB=grandplan
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Server
BETTER_AUTH_SECRET=dev-secret-local-dev-only
CORS_ORIGIN=http://localhost:3001

# Web
VITE_SERVER_URL=http://localhost:3000

# Optional: API keys for integrations
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
```

See `.env.local` for all available options.

## System Requirements

### Minimum
- 4GB RAM
- 2 CPU cores
- 10GB disk space
- Docker Desktop installed

### Recommended
- 8GB+ RAM
- 4 CPU cores
- 20GB disk space
- Latest Docker Desktop

## Common Issues

### Services won't start
```bash
docker-compose logs          # View error messages
docker-compose build         # Rebuild images
docker-compose up            # Try again
```

### Port already in use
```bash
lsof -i :3000               # Find process
kill -9 <PID>               # Kill process
# Or change port in .env.local
```

### Hot reload not working
```bash
docker-compose restart server   # Restart service
docker-compose logs -f server   # Check logs
```

### Database connection failed
```bash
docker-compose logs postgres    # Check postgres logs
docker-compose down -v          # Remove volumes
docker-compose up postgres      # Start fresh
```

For more help, see [DOCKER_VALIDATION.md](./DOCKER_VALIDATION.md) troubleshooting section.

## Health & Status

### Check Service Health
```bash
# Show all services and health status
docker-compose ps

# Check specific service
docker-compose exec postgres pg_isready -U postgres   # PostgreSQL
docker-compose exec redis redis-cli ping               # Redis
curl -f http://localhost:3000/health                   # Server
```

### Monitor Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server

# Last 100 lines
docker-compose logs --tail=100
```

### System Resources
```bash
# Show container stats
docker stats

# Show events
docker-compose events
```

## Data Persistence

Your data persists in Docker volumes:
- **PostgreSQL**: `grandplan_postgres_data` volume
- **Redis**: `grandplan_redis_data` volume

To preserve data across restarts:
```bash
docker-compose restart          # Services stay running, data preserved
docker-compose stop             # Graceful shutdown, data preserved
docker-compose down             # Containers removed, volumes preserved
docker-compose down -v          # Remove containers AND volumes (deletes data)
```

## Networking

All services communicate via the `grandplan` Docker network:

### Service Discovery
From within containers, access services by name:
- `postgres:5432` - PostgreSQL
- `redis:6379` - Redis
- `server:3000` - API
- `web:5173` - Frontend (internal)

### External Access
From your machine:
- `localhost:5432` - PostgreSQL
- `localhost:6379` - Redis
- `localhost:3000` - API
- `localhost:3001` - Frontend (mapped from 5173)

## Performance Tips

### Faster Builds
```bash
# Enable BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Use cache
docker-compose up -d --build   # Uses existing cache
```

### Reduce Memory Usage
```bash
# Stop unused services
docker-compose stop web         # Keep API and DB running

# Check resource usage
docker stats
```

### Better File Watching
- File changes are monitored via bind mounts
- Hot reload works automatically
- No additional configuration needed

## Next Steps

1. Start services: `./docker-dev.sh up`
2. Access web app: `open http://localhost:3001`
3. View logs: `docker-compose logs -f`
4. Read guides above for more details
5. Start developing!

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/docs/)
- [Vite HMR Docs](https://vitejs.dev/)
- [Express Docs](https://expressjs.com/)

## Support

For issues:
1. Check [DOCKER_VALIDATION.md](./DOCKER_VALIDATION.md) troubleshooting section
2. Review service logs: `docker-compose logs <service>`
3. Check Docker Desktop status
4. Ensure ports are available: `lsof -i :3000`
5. Read [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md) for detailed help

---

**Ready to develop!** Start with `./docker-dev.sh up` and enjoy the fully containerized local environment.
