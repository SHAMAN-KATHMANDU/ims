---
name: deployment-patterns
description: Deployment strategies including rolling updates, blue-green, canary deployments, Docker multi-stage builds, GitHub Actions CI/CD pipelines, health checks, and rollback procedures.
origin: ECC
---

# Deployment Patterns

Production deployment strategies for zero-downtime releases.

## When to Activate

- Setting up CI/CD pipelines
- Planning a production deployment
- Implementing zero-downtime deployments
- Configuring health checks
- Planning rollback strategies
- Setting up staging environments

## Deployment Strategies

### Rolling Update (Default)

Gradually replace old instances with new ones.

```yaml
# docker-compose.yml (production)
services:
  api:
    image: ghcr.io/org/projectx-api:${VERSION}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1 # Update 1 instance at a time
        delay: 10s # Wait 10s between updates
        failure_action: rollback
        order: start-first # Start new before stopping old
      rollback_config:
        parallelism: 1
        delay: 5s
```

**Pros:** Simple, no extra infrastructure
**Cons:** Mixed versions running simultaneously, slower rollout

### Blue-Green Deployment

Run two identical environments, switch traffic instantly.

```nginx
# nginx.conf
upstream api_blue {
  server api-blue:3000;
}

upstream api_green {
  server api-green:3000;
}

# Switch by changing this variable
set $active_env "blue";

server {
  location /api/ {
    proxy_pass http://api_${active_env}/;
  }
}
```

```bash
# Deploy to green (inactive)
docker compose -f docker-compose.green.yml up -d

# Run smoke tests on green
./scripts/smoke-test.sh green

# Switch traffic to green
./scripts/switch-traffic.sh green

# Monitor for 10 minutes
sleep 600

# Decommission blue (or keep as rollback)
docker compose -f docker-compose.blue.yml down
```

**Pros:** Instant rollback, zero downtime, full testing before switch
**Cons:** Requires 2x infrastructure, database migrations must be backward compatible

### Canary Deployment

Route a small percentage of traffic to the new version.

```nginx
# nginx.conf — 10% canary traffic
upstream api_stable {
  server api-v1:3000 weight=9;
  server api-v2:3000 weight=1;  # 10% to canary
}
```

```yaml
# Kubernetes canary (if using K8s)
# stable: 9 replicas, canary: 1 replica = 10% traffic
```

**Pros:** Gradual rollout, real traffic testing, easy rollback
**Cons:** Complex routing, need good monitoring

## GitHub Actions CI/CD

### Complete Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: production
      cancel-in-progress: false # Never cancel in-progress deployments

    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/projectx

            # Pull new image
            docker pull ${{ needs.build.outputs.image-tag }}

            # Run migrations
            docker run --rm \
              --env-file .env.production \
              ${{ needs.build.outputs.image-tag }} \
              npx prisma migrate deploy

            # Rolling update
            docker compose up -d --no-deps api

            # Health check
            ./scripts/health-check.sh

            # Cleanup old images
            docker image prune -f
```

### PR Preview Environments

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy preview
        run: |
          # Deploy to preview environment with PR number
          PREVIEW_URL="https://pr-${{ github.event.number }}.preview.example.com"
          echo "Preview URL: $PREVIEW_URL"

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: https://pr-${{ github.event.number }}.preview.example.com'
            })

  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup preview
        run: echo "Cleanup preview environment for PR ${{ github.event.number }}"
```

## Health Checks

### Application Health Endpoint

```typescript
// apps/api/src/routes/health.ts
import { Router } from "express";
import prisma from "@/config/prisma";
import redis from "@/config/redis";

const router = Router();

router.get("/health", async (req, res) => {
  const checks: Record<string, "healthy" | "unhealthy"> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch {
    checks.database = "unhealthy";
  }

  // Redis check
  try {
    await redis.ping();
    checks.redis = "healthy";
  } catch {
    checks.redis = "unhealthy";
  }

  const isHealthy = Object.values(checks).every((v) => v === "healthy");

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    version: process.env.APP_VERSION ?? "unknown",
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Liveness probe (is the process alive?)
router.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// Readiness probe (is the service ready to accept traffic?)
router.get("/health/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});
```

### Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

MAX_RETRIES=30
RETRY_INTERVAL=5
HEALTH_URL="http://localhost:3000/health"

echo "Waiting for service to be healthy..."

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

  if [ "$STATUS" = "200" ]; then
    echo "Service is healthy!"
    exit 0
  fi

  echo "Attempt $i/$MAX_RETRIES: Status $STATUS, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Service failed to become healthy after $((MAX_RETRIES * RETRY_INTERVAL))s"
exit 1
```

## Rollback Procedures

### Immediate Rollback

```bash
# Option 1: Revert to previous Docker image tag
docker compose up -d --no-deps api \
  --image ghcr.io/org/projectx-api:sha-abc1234

# Option 2: Git revert + redeploy
git revert HEAD --no-edit
git push origin main
# CI/CD pipeline triggers automatically

# Option 3: Feature flag (no deployment needed)
# Disable the feature flag in config/feature-flags
```

### Database Rollback

```bash
# Rollback is NOT automatic — plan ahead!

# Option 1: Restore from backup (last resort)
pg_restore -d $DATABASE_URL backup_20250115.dump

# Option 2: Forward-only rollback migration
npx prisma migrate dev --name rollback_feature_x
# Write SQL to undo the schema change

# Option 3: Expand-contract (preferred)
# Keep old columns/tables until rollback window passes
```

## Environment Configuration

```bash
# .env.production (on server, never in git)
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<32+ random bytes>
JWT_REFRESH_SECRET=<32+ random bytes>
APP_VERSION=sha-abc1234

# Generate strong secrets
openssl rand -base64 32  # For JWT secrets
openssl rand -hex 32     # For API keys
```

## Deployment Checklist

Before every production deployment:

**Pre-deployment**

- [ ] All tests passing in CI
- [ ] Database migrations are backward compatible
- [ ] Feature flags configured for gradual rollout
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

**Deployment**

- [ ] Run migrations before deploying code
- [ ] Deploy to staging first, verify
- [ ] Deploy to production with rolling update
- [ ] Monitor error rates and latency during rollout

**Post-deployment**

- [ ] Health checks passing
- [ ] Error rates normal (< baseline)
- [ ] Key user flows tested
- [ ] Monitoring alerts not firing
- [ ] Deployment documented in changelog
