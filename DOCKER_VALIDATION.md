# Docker Compose Setup Validation Checklist

Use this checklist to verify your Docker Compose setup is complete and working.

## Pre-Flight Checks

- [ ] Docker Desktop is installed and running
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] You're in the correct directory
  ```bash
  pwd  # Should show /Users/vivek/jet/grandplan/grandplan
  ```

- [ ] Files are present and not corrupted
  ```bash
  ls -la docker-compose.yml
  ls -la docker-compose.override.yml
  ls -la .env.local
  ls -la docker-dev.sh
  ```

- [ ] No conflicting services on required ports
  ```bash
  lsof -i :3000  # Should be empty
  lsof -i :5173  # Should be empty
  lsof -i :5432  # Should be empty
  lsof -i :6379  # Should be empty
  ```

## Configuration Validation

- [ ] docker-compose.yml is valid
  ```bash
  docker-compose config > /dev/null && echo "Valid" || echo "Invalid"
  ```

- [ ] All required services are defined
  ```bash
  docker-compose config | grep -E "services:|postgres:|redis:|server:|web:|worker:"
  ```

- [ ] All required ports are exposed
  ```bash
  docker-compose config | grep -E "5432|6379|3000|5173"
  ```

- [ ] Environment variables are set
  ```bash
  cat .env.local | head -20
  ```

- [ ] Dockerfiles have development targets
  ```bash
  grep "AS development" apps/server/Dockerfile
  grep "AS development" apps/web/Dockerfile
  grep "AS development" apps/worker/Dockerfile
  ```

## Network Validation

- [ ] Network is defined
  ```bash
  docker-compose config | grep -A 3 "networks:"
  ```

- [ ] All services are on the network
  ```bash
  docker-compose config | grep -B 5 "network:"
  ```

## Volume Validation

- [ ] Persistent volumes are defined
  ```bash
  docker-compose config | grep -A 5 "^volumes:"
  ```

- [ ] Source mount directories exist
  ```bash
  ls -d apps/server/src apps/web/src apps/worker/src packages
  ```

- [ ] Volume permissions are correct
  ```bash
  ls -la apps/server/src
  ls -la apps/web/src
  ```

## Health Check Validation

- [ ] Health checks are configured
  ```bash
  docker-compose config | grep -B 3 "healthcheck:"
  ```

- [ ] Health check intervals are reasonable (10-30s)
  ```bash
  docker-compose config | grep "interval:"
  ```

- [ ] Health check retries are configured (3-5)
  ```bash
  docker-compose config | grep "retries:"
  ```

## First-Time Startup

### 1. Build Images
- [ ] Build completes without errors
  ```bash
  docker-compose build --no-cache
  ```
  Expected time: 5-10 minutes (slower on first run)

- [ ] All images are created
  ```bash
  docker images | grep grandplan
  # Should show: server, web, worker images
  ```

### 2. Start Services
- [ ] Services start without errors
  ```bash
  docker-compose up &
  sleep 30
  docker-compose ps
  ```
  Expected: All services showing as "Up" or "healthy"

- [ ] No restart loops
  ```bash
  docker-compose logs | grep -i restart
  # Should show minimal restart activity
  ```

### 3. Check Service Health
- [ ] All services are healthy
  ```bash
  docker-compose ps | grep -i healthy
  # Should show all services as healthy
  ```

- [ ] PostgreSQL is responding
  ```bash
  docker-compose exec postgres pg_isready -U postgres
  # Expected: "accepting connections"
  ```

- [ ] Redis is responding
  ```bash
  docker-compose exec redis redis-cli ping
  # Expected: "PONG"
  ```

- [ ] Server API is responding
  ```bash
  curl -f http://localhost:3000/health || echo "Not ready yet"
  # May be "Not ready" if server is still starting
  ```

- [ ] Web is responding
  ```bash
  curl -f http://localhost:3001 > /dev/null && echo "OK" || echo "Checking..."
  ```

### 4. Database Setup
- [ ] Can access PostgreSQL
  ```bash
  docker-compose exec postgres psql -U postgres -d grandplan -c "SELECT 1;"
  # Expected: Should execute and return
  ```

- [ ] Can access Redis
  ```bash
  docker-compose exec redis redis-cli SET test "ok" && redis-cli GET test
  # Expected: Should return "ok"
  ```

### 5. Logs Validation
- [ ] No error messages in logs
  ```bash
  docker-compose logs | grep -i error | head -5
  # Should be empty or minimal
  ```

- [ ] Server started successfully
  ```bash
  docker-compose logs server | grep -i "listening\|started\|running"
  ```

- [ ] Web started successfully
  ```bash
  docker-compose logs web | grep -i "local:\|listening\|vite"
  ```

- [ ] Worker started successfully
  ```bash
  docker-compose logs worker | grep -i "started\|listening"
  ```

## Development Features Validation

- [ ] Hot reload working (Server)
  ```bash
  # Edit a file in apps/server/src/
  # Check logs for reload message
  docker-compose logs -f server
  ```

- [ ] Hot reload working (Web)
  ```bash
  # Edit a file in apps/web/src/
  # Check browser console for HMR message
  docker-compose logs -f web
  ```

- [ ] Helper script is functional
  ```bash
  ./docker-dev.sh ps
  # Should show all services
  ```

- [ ] Helper script commands work
  ```bash
  ./docker-dev.sh logs server | head -5
  ./docker-dev.sh status
  ```

## Port Access Validation

- [ ] PostgreSQL accessible on 5432
  ```bash
  netstat -an | grep 5432
  # Or on macOS/Linux:
  lsof -i :5432
  ```

- [ ] Redis accessible on 6379
  ```bash
  redis-cli -h localhost -p 6379 ping
  # Expected: "PONG"
  ```

- [ ] Server accessible on 3000
  ```bash
  curl -I http://localhost:3000/health
  # Expected: HTTP 200 or 404 (port is open)
  ```

- [ ] Web accessible on 3001
  ```bash
  curl -I http://localhost:3001
  # Expected: HTTP 200 or similar
  ```

## Resource Validation

- [ ] Disk space is sufficient
  ```bash
  df -h | grep -E "/$|/Users"
  # Need at least 10GB free
  ```

- [ ] Memory usage is reasonable
  ```bash
  docker stats --no-stream
  # Total should be < 50% of available RAM
  ```

- [ ] No orphaned containers
  ```bash
  docker ps -a | grep -v "CONTAINER\|grandplan"
  ```

- [ ] No dangling volumes
  ```bash
  docker volume ls | grep "dangling"
  # Should be empty
  ```

## Persistence Validation

- [ ] PostgreSQL data persists
  ```bash
  docker-compose exec postgres psql -U postgres -d grandplan -c "CREATE TABLE test (id INT);"
  docker-compose restart postgres
  docker-compose exec postgres psql -U postgres -d grandplan -c "SELECT * FROM information_schema.tables WHERE table_name='test';"
  # Should still exist after restart
  ```

- [ ] Redis data persists
  ```bash
  docker-compose exec redis redis-cli SET persist_test "data"
  docker-compose restart redis
  docker-compose exec redis redis-cli GET persist_test
  # Should return "data"
  ```

## Integration Validation

- [ ] Server can connect to PostgreSQL
  ```bash
  # Check server logs for successful connection
  docker-compose logs server | grep -i "database\|postgres"
  ```

- [ ] Server can connect to Redis
  ```bash
  # Check server logs for successful Redis connection
  docker-compose logs server | grep -i "redis"
  ```

- [ ] Web can reach Server API
  ```bash
  # Check browser network tab or web logs
  docker-compose logs web | grep -i "api\|server"
  ```

- [ ] Worker can connect to database and Redis
  ```bash
  # Check worker logs
  docker-compose logs worker | grep -i "database\|redis\|connected"
  ```

## Advanced Validation

### Network Inspection
```bash
# View network details
docker network inspect grandplan_grandplan

# Check service DNS resolution
docker-compose exec server ping postgres
# Expected: Should resolve to 172.20.x.x

# Check service connectivity
docker-compose exec server curl -I http://redis:6379
# Expected: Connection test successful
```

### Volume Inspection
```bash
# Check volume contents
docker volume ls | grep grandplan

# Inspect volume
docker volume inspect grandplan_postgres_data

# View volume mount paths
docker-compose config | grep -A 3 "volumes:"
```

### Image Inspection
```bash
# Check image layers
docker image history grandplan-server | head -10

# View image size
docker images | grep grandplan

# Check entrypoint
docker inspect grandplan-server | grep -A 3 "Entrypoint"
```

## Cleanup & Reset

### Partial Reset (Keep data)
```bash
# Stop and restart all services
docker-compose restart
```

### Full Reset (Remove everything)
```bash
# Stop all services
docker-compose down -v

# Verify cleanup
docker ps
docker volume ls | grep grandplan
# Both should be empty
```

### Image Cleanup
```bash
# Remove images (rebuild if needed)
docker-compose down --rmi all

# Verify cleanup
docker images | grep grandplan
# Should be empty
```

## Final Checklist

Before considering setup complete:

- [ ] All services are running and healthy
- [ ] All ports are accessible
- [ ] Database migrations are applied
- [ ] Hot reload is working for server and web
- [ ] No error messages in logs
- [ ] Data persists across restarts
- [ ] Helper script works correctly
- [ ] System resources are reasonable
- [ ] Docker Compose config is valid
- [ ] All documentation files are readable

## Success Criteria

Your setup is successful when:

1. ✅ `docker-compose ps` shows all services as "healthy" or "running"
2. ✅ `curl http://localhost:3000/health` returns a response
3. ✅ Browser can access http://localhost:3001
4. ✅ `docker-compose exec postgres psql -U postgres -d grandplan -c "SELECT 1;"` works
5. ✅ `docker-compose exec redis redis-cli ping` returns "PONG"
6. ✅ No error messages when editing files and checking logs
7. ✅ `./docker-dev.sh status` shows all services

## Troubleshooting

If any check fails:

1. **Review the specific section** above
2. **Check logs**: `docker-compose logs <service>`
3. **Verify configuration**: `docker-compose config | head -50`
4. **Check Docker Desktop**: Ensure it's running and updated
5. **Review [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md)** troubleshooting section
6. **Check system resources**: Memory, disk, CPU
7. **Restart services**: `docker-compose down -v && docker-compose up`

## Quick Reference

```bash
# Validate syntax
docker-compose config > /dev/null && echo "Valid"

# Check all services
docker-compose ps

# View all logs
docker-compose logs | tail -50

# Test connectivity
docker-compose exec server curl -I http://redis:6379

# Restart specific service
docker-compose restart server

# Full reset
docker-compose down -v && docker-compose build --no-cache && docker-compose up

# Helper script
./docker-dev.sh status
```

---

**When all checks pass, your local development environment is ready to use!**
