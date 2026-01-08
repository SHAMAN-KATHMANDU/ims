# Docker Development Guide

This guide explains how to run the project using Docker in development mode.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2 (included with Docker Desktop)
- `.env` file configured in the root directory

## Quick Start (Development)

1. **Start all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Start in detached mode (background):**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

4. **View logs for specific service:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f web
   docker-compose -f docker-compose.dev.yml logs -f api
   ```

5. **Stop all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

6. **Stop and remove volumes (clean slate):**
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   ```

## Building

**Build all services:**
```bash
docker-compose -f docker-compose.dev.yml build
```

**Build specific service:**
```bash
docker-compose -f docker-compose.dev.yml build web
docker-compose -f docker-compose.dev.yml build api
```

**Rebuild without cache:**
```bash
docker-compose -f docker-compose.dev.yml build --no-cache
```

## Development Features

### Hot Reload
- ✅ **Web app**: Source code changes trigger automatic reload (Next.js)
- ✅ **API**: Source code changes trigger automatic restart (nodemon)
- ✅ **Shared packages**: Changes in `packages/` are reflected in both services

### Volume Mounts
The development setup uses volume mounts for:
- Source code (`apps/web`, `apps/api`, `packages/`)
- Excludes `node_modules` (uses container's installed dependencies)
- Excludes `.next` build folder (prevents permission issues)

## Services

### Web App
- **URL**: http://localhost:3000
- **Port**: 3000
- **Hot Reload**: Enabled
- **Logs**: `docker-compose -f docker-compose.dev.yml logs -f web`

### API
- **URL**: http://localhost:4000
- **Port**: 4000
- **Hot Reload**: Enabled (via nodemon)
- **Logs**: `docker-compose -f docker-compose.dev.yml logs -f api`

### PostgreSQL
- **Port**: 5432
- **Database**: Configured via `.env`
- **Persistent Storage**: Volume `postgres_data`

## Troubleshooting

### lightningcss Error

If you see `Cannot find module '../lightningcss.linux-x64-gnu.node'`:

1. **Rebuild the web container:**
   ```bash
   docker-compose -f docker-compose.dev.yml build --no-cache web
   docker-compose -f docker-compose.dev.yml up web
   ```

2. **Check the build logs** for the lightningcss binary installation step

3. **Verify binary exists** (inside container):
   ```bash
   docker-compose -f docker-compose.dev.yml exec web find node_modules -name "lightningcss.linux-x64-gnu.node"
   ```

### Port Already in Use

If ports 3000, 4000, or 5432 are already in use:

1. **Stop existing services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

2. **Or modify ports in `docker-compose.dev.yml`:**
   ```yaml
   ports:
     - "3001:3000"  # Change host port
   ```

### Database Connection Issues

1. **Check PostgreSQL is healthy:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps postgres
   ```

2. **Check database logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs postgres
   ```

3. **Verify environment variables** in `.env` file

### Clear Everything and Start Fresh

```bash
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v

# Remove all images
docker-compose -f docker-compose.dev.yml rm -f

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml build --no-cache

# Start services
docker-compose -f docker-compose.dev.yml up
```

## Common Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# Restart a service
docker-compose -f docker-compose.dev.yml restart web

# Execute command in container
docker-compose -f docker-compose.dev.yml exec web pnpm install
docker-compose -f docker-compose.dev.yml exec api pnpm prisma migrate dev

# View container shell
docker-compose -f docker-compose.dev.yml exec web sh
docker-compose -f docker-compose.dev.yml exec api sh

# Rebuild specific service
docker-compose -f docker-compose.dev.yml build --no-cache web

# View resource usage
docker-compose -f docker-compose.dev.yml stats
```

## Production

For production builds, use the regular `docker-compose.yml`:

```bash
docker-compose up --build
```

This uses the production Dockerfiles without volume mounts.

## Environment Variables

Make sure you have the following `.env` files:

1. **Root `.env`** - Shared environment variables
2. **`apps/api/.env`** - API-specific variables
3. **`apps/web/.env`** - Web-specific variables

Example `.env` structure:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=projectx
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/projectx

# API
PORT=4000
JWT_SECRET=your_jwt_secret

# Web
NEXT_PUBLIC_API_URL=http://api:4000
```

