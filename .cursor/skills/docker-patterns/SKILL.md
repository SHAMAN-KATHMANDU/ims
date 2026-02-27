---
name: docker-patterns
description: Docker and Docker Compose patterns for local development including multi-stage builds, networking, volumes, container security, .dockerignore, and debugging techniques.
origin: ECC
---

# Docker Patterns

Production-ready Docker patterns for local development and deployment.

## When to Activate

- Setting up Docker for a new project
- Writing Dockerfiles for Node.js services
- Configuring Docker Compose for local dev
- Debugging container issues
- Optimizing image sizes
- Securing containers

## Multi-Stage Dockerfile (Node.js)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Build
RUN pnpm --filter api build

# Stage 3: Runner (minimal production image)
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copy only production artifacts
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules

USER apiuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

## .dockerignore

```
# Version control
.git
.gitignore

# Dependencies (will be installed in container)
node_modules
**/node_modules

# Build artifacts
dist
build
.next
out

# Development files
.env
.env.*
!.env.example

# Test files
**/*.test.ts
**/*.spec.ts
coverage
.nyc_output

# Editor files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs

# Documentation
docs
*.md
!README.md
```

## Docker Compose for Local Development

```yaml
# docker-compose.yml
version: "3.9"

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: deps  # Use deps stage for dev (includes devDependencies)
    volumes:
      - ./apps/api/src:/app/apps/api/src  # Hot reload
      - /app/node_modules  # Don't override container's node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/projectx_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: pnpm --filter api dev

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: deps
    volumes:
      - ./apps/web/src:/app/apps/web/src
      - ./apps/web/public:/app/apps/web/public
      - /app/node_modules
    ports:
      - "3001:3001"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
    command: pnpm --filter web dev

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: projectx_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./deploy/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Optional: pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: ["tools"]  # Only start with: docker compose --profile tools up
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

## Networking

```yaml
# Named networks for service isolation
services:
  api:
    networks:
      - backend
      - frontend

  web:
    networks:
      - frontend

  postgres:
    networks:
      - backend  # Only accessible to backend services

  redis:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

```bash
# Services communicate by service name
# From api container: connect to postgres at "postgres:5432"
# From web container: connect to api at "api:3000"
```

## Environment Variables

```yaml
# docker-compose.yml — use env_file for local dev
services:
  api:
    env_file:
      - .env
      - .env.local  # Override for local (gitignored)
    environment:
      # These override env_file values
      NODE_ENV: development
```

```bash
# .env.example (committed to git)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/projectx_dev
REDIS_URL=redis://redis:6379
JWT_SECRET=change-me-in-production
PORT=3000

# .env (gitignored, actual values)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/projectx_dev
REDIS_URL=redis://redis:6379
JWT_SECRET=super-secret-dev-key
PORT=3000
```

## Container Security

```dockerfile
# ✅ Use specific version tags (not latest)
FROM node:20.11.0-alpine AS runner  # ✅
FROM node:latest AS runner          # ❌

# ✅ Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

# ✅ Read-only filesystem where possible
# docker run --read-only --tmpfs /tmp myimage

# ✅ Drop capabilities
# docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myimage

# ✅ No secrets in Dockerfile or image
# Use environment variables or secrets management
# ❌ COPY .env /app/.env
# ❌ ENV JWT_SECRET=mysecret
```

```yaml
# docker-compose.yml security settings
services:
  api:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

## Volumes

```yaml
# Named volumes (persistent data)
volumes:
  postgres_data:    # Persists across container restarts
  redis_data:

# Bind mounts (development hot reload)
services:
  api:
    volumes:
      - ./apps/api/src:/app/apps/api/src  # Source code (hot reload)
      - /app/node_modules                  # Anonymous volume (prevents host override)
```

## Debugging

```bash
# View container logs
docker compose logs api
docker compose logs api -f  # Follow
docker compose logs api --tail=100

# Execute commands in running container
docker compose exec api sh
docker compose exec postgres psql -U postgres projectx_dev

# Inspect container
docker compose ps
docker inspect projectx-api-1

# Check resource usage
docker stats

# Rebuild after Dockerfile changes
docker compose build api
docker compose up api --build

# Remove volumes (reset database)
docker compose down -v

# View image layers
docker history projectx-api:latest
```

## Common Patterns

### Wait for Dependencies

```bash
# Use depends_on with health checks (preferred)
depends_on:
  postgres:
    condition: service_healthy

# Or use wait-for-it script
COPY scripts/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
CMD ["/wait-for-it.sh", "postgres:5432", "--", "node", "dist/server.js"]
```

### Database Migrations on Startup

```dockerfile
# Run migrations before starting the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Development vs Production

```bash
# Development (with hot reload)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run specific service
docker compose up api postgres redis

# Scale a service
docker compose up --scale api=3
```

## Image Size Optimization

```bash
# Check image size
docker images | grep projectx

# Use alpine base images
FROM node:20-alpine  # ~50MB vs node:20 ~1GB

# Multi-stage builds (only copy production artifacts)
# See multi-stage Dockerfile above

# Analyze image layers
docker history projectx-api:latest --no-trunc

# Use dive tool for layer analysis
dive projectx-api:latest
```
