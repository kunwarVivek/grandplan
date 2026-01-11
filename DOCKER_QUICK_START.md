# Docker Compose Quick Start

Get your complete development environment running in minutes.

## Prerequisites

- Docker Desktop (includes Docker and Docker Compose)
- Git
- Terminal/Command line

## Installation

### macOS / Windows
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd grandplan
```

### 2. Start all services
```bash
# Using helper script (recommended)
./docker-dev.sh up

# Or with docker-compose directly
docker-compose up

# Or run in background
docker-compose up -d
```

### 3. Wait for services to be healthy
```bash
# Check status
docker-compose ps

# All services should show "healthy" or "running"
```

### 4. Run database migrations
```bash
./docker-dev.sh migrate

# Or manually
docker-compose exec server pnpm migrate
```

### 5. Access the application
```bash
# Web application
open http://localhost:3001

# API documentation (if available)
open http://localhost:3000/api/docs

# Redis CLI
docker-compose exec redis redis-cli

# PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d grandplan
```

## Common Commands

### Using Helper Script (Recommended)

```bash
# Start services
./docker-dev.sh up              # Foreground with logs
./docker-dev.sh up -d           # Background

# View logs
./docker-dev.sh logs            # All services
./docker-dev.sh logs -f server  # Follow server logs

# Interactive shell
./docker-dev.sh shell server    # Enter container shell
./docker-dev.sh shell web       # Web app shell

# Database
./docker-dev.sh migrate         # Run migrations

# Rebuild
./docker-dev.sh rebuild server  # Rebuild server image

# Stop and clean
./docker-dev.sh down            # Stop containers
./docker-dev.sh down -v         # Stop and remove volumes

# Status
./docker-dev.sh ps              # Show containers
./docker-dev.sh status          # Same as ps
```

### Using Docker Compose Directly

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f          # All services
docker-compose logs -f server   # Specific service

# Execute commands
docker-compose exec server pnpm build
docker-compose exec web pnpm test

# Interactive shell
docker-compose exec -it server bash

# Database
docker-compose exec postgres psql -U postgres -d grandplan
docker-compose exec redis redis-cli

# Stop
docker-compose down
docker-compose down -v          # Also remove volumes

# Rebuild
docker-compose build
docker-compose build --no-cache server
```

## Services

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| PostgreSQL | 5432 | - | Database |
| Redis | 6379 | - | Cache & Queue |
| Server | 3000 | http://localhost:3000 | Backend API |
| Web | 3001 | http://localhost:3001 | Frontend App |
| Worker | - | - | Background Jobs |

## Development Workflow

### Making Code Changes

1. **Server (Node.js API)**
   - Edit files in `apps/server/src/`
   - Changes automatically reload via tsx watch
   - No container restart needed

2. **Web (React Frontend)**
   - Edit files in `apps/web/src/`
   - Changes automatically reload via Vite HMR
   - No container restart needed

3. **Worker (Background Jobs)**
   - Edit files in `apps/worker/src/`
   - Requires container restart for changes
   - `docker-compose restart worker`

4. **Shared Packages**
   - Edit files in `packages/*/src/`
   - Server and web automatically reload
   - Worker requires restart

### Running Database Migrations

```bash
# Create a new migration
docker-compose exec server pnpm prisma migrate dev --name my_feature

# Apply migrations
docker-compose exec server pnpm migrate

# Reset database (⚠️ deletes all data)
docker-compose exec server pnpm prisma migrate reset
```

### Running Tests

```bash
# Server tests
docker-compose exec server pnpm test

# Web tests
docker-compose exec web pnpm test

# All tests
pnpm test
```

### Building for Production

```bash
# Build without Docker
pnpm build

# Build Docker images for production
docker-compose build --no-cache

# View images
docker images | grep grandplan
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Specific service
docker-compose logs server

# Rebuild images
docker-compose build --no-cache
docker-compose up
```

### Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env.local
SERVER_PORT=3001
```

### Database connection failed

```bash
# Check if postgres is running
docker-compose exec postgres pg_isready -U postgres

# View postgres logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

### Hot reload not working

```bash
# Restart service
docker-compose restart server

# Check file permissions
ls -la apps/server/src

# Verify volume mounts
docker-compose config | grep volumes
```

## Environment Configuration

### Create local config file

```bash
# Copy example
cp .env.local .env.local

# Edit as needed
nano .env.local
```

### Key environment variables

```bash
# Database
POSTGRES_DB=grandplan
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Redis
REDIS_PASSWORD=

# Server
PORT=3000
NODE_ENV=development
BETTER_AUTH_SECRET=dev-secret-local-dev-only

# Web
VITE_SERVER_URL=http://localhost:3000
```

See `.env.local` for all available options.

## System Requirements

### Minimum
- 4GB RAM
- 2 CPU cores
- 10GB disk space

### Recommended
- 8GB+ RAM
- 4 CPU cores
- 20GB disk space

## Useful Tips

### Speed up Docker on macOS

Edit Docker Desktop settings:
- Resources → Memory: 6GB
- Resources → CPUs: 4
- File Sharing: Add your project directory

### Monitor services
```bash
# Real-time container stats
docker stats

# View events
docker-compose events

# Inspect service
docker-compose exec server npm list
```

### Database backup
```bash
# Backup
docker-compose exec postgres pg_dump -U postgres grandplan > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres grandplan < backup.sql
```

## Next Steps

1. Read [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md) for comprehensive documentation
2. Check service logs: `docker-compose logs -f`
3. Start developing!

## Support

For issues:
1. Check logs: `docker-compose logs [service]`
2. Review [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md) troubleshooting section
3. Check Docker Dashboard for container status
4. Ensure Docker Desktop is running and up to date
