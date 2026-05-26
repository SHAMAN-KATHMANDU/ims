# Local Dev Docker Setup

> Executable runbook for a hot-reload local dev stack that mirrors `ims_dev`.
> Reader: future Claude sessions or a human. Execute top-to-bottom.

## What this gives you

A full local mirror of the staging stack with **hot reload from source**:

| Service       | Port   | Notes                                             |
| ------------- | ------ | ------------------------------------------------- |
| `postgres`    | 5432   | postgres:16, volume-persisted                     |
| `redis`       | 6379   | redis:7-alpine, required by API (BullMQ + Socket) |
| `api`         | 4000   | `pnpm --filter api dev` with source mount         |
| `web`         | 3000   | `next dev` with source mount                      |
| `tenant-site` | 3100   | `next dev --port 3100` with source mount          |
| `caddy`       | 80/443 | host-header routing for tenant custom-domain test |

API auto-runs `prisma migrate deploy` + seed (idempotent) on first start.

## Prereqs

```bash
docker --version          # Docker Desktop running
pnpm --version            # 9.x
node --version            # 20.x
```

If Docker daemon isn't running:

```bash
open -a Docker            # macOS
```

Wait until `docker ps` returns without error.

## Decisions baked into this guide

- **Hot reload from source** — mount `apps/` and `packages/`, run `pnpm dev` inside containers. Code changes restart automatically. Dep changes (`package.json`) require a rebuild.
- **Full mirror** — tenant-site + Caddy are included so host-header routing works (`*.local.test` resolves via `/etc/hosts` or `dnsmasq`).
- **Auto migrate + seed on first start** — entrypoint runs `prisma migrate deploy` always; seed only when the platform admin row is missing.

To change any of these, edit the YAML below — don't fork the guide.

---

# Step 1 — Environment variables

## How env loading works in this project

There are **two** independent dev workflows. Both read env vars, but from different places:

| Workflow                      | Used by                                          | Env source                                                                   |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Docker** (this guide)       | `docker-compose.dev.yml`                         | Root `.env` via `env_file:` in compose                                       |
| **Host pnpm dev** (no docker) | `pnpm --filter api dev`, `pnpm --filter web dev` | `apps/api/.env`, `apps/web/.env.local` — read by `dotenv` / Next.js directly |

The root `.env` is **the single source of truth for the docker stack**. The per-app envs stay for when you run apps directly on the host (faster API iteration without docker).

### Source-of-truth files (don't change these — they are the authoritative schemas)

| File                                        | What it defines                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/api/src/config/env.ts`                | All API env vars, validated by Zod at boot. API exits if required vars are missing in staging/prod. |
| `apps/api/.env.example`                     | Annotated template for API                                                                          |
| `apps/tenant-site/env.d.ts`                 | Required tenant-site env vars (typed)                                                               |
| `apps/web/.env.example`                     | Web Next.js public vars                                                                             |
| `.env.example` (root)                       | Combined Docker stack template                                                                      |
| `~/deploy/.env` on `ims_dev` (43.204.67.93) | Live values for staging — closest reference for production parity                                   |

## Required vs optional matrix

`R` = required for stack to boot. `r` = required only if feature is used. `o` = optional. Empty = irrelevant for that service.

| Var                                                                                     | API | Web | Tenant-site | Postgres | Notes                                                                                   |
| --------------------------------------------------------------------------------------- | :-: | :-: | :---------: | :------: | --------------------------------------------------------------------------------------- |
| `POSTGRES_USER`                                                                         |     |     |             |    R     | DB role for the container                                                               |
| `POSTGRES_PASSWORD`                                                                     |     |     |             |    R     |                                                                                         |
| `POSTGRES_DB`                                                                           |     |     |             |    R     | Must match `DATABASE_URL` db name                                                       |
| `DATABASE_URL`                                                                          |  R  |     |             |          | Host = compose service name (`postgres`)                                                |
| `REDIS_URL`                                                                             |  R  |     |             |          | BullMQ + Socket.IO adapter                                                              |
| `NODE_ENV`                                                                              |  R  |  r  |      r      |          | `development` keeps zod lenient                                                         |
| `APP_ENV`                                                                               |  o  |  o  |      o      |          | Overrides `NODE_ENV` for feature gates                                                  |
| `PORT`                                                                                  |  R  |     |      r      |          | API 4000, tenant 3100                                                                   |
| `HOST`                                                                                  |  o  |     |             |          | `0.0.0.0` inside docker                                                                 |
| `JWT_SECRET`                                                                            |  R  |     |             |          | Required in staging/prod by zod                                                         |
| `JWT_REFRESH_SECRET`                                                                    |  r  |     |             |          | Falls back to `JWT_SECRET` in dev                                                       |
| `JWT_ACCESS_TOKEN_TTL`                                                                  |  o  |     |             |          | Default `15m`                                                                           |
| `JWT_REFRESH_TOKEN_TTL`                                                                 |  o  |     |             |          | Default `30d`                                                                           |
| `CORS_ORIGIN`                                                                           |  R  |     |             |          | Required in staging/prod. Comma-list ok. Dev defaults to `localhost:3000/3001`          |
| `API_PUBLIC_URL`                                                                        |  R  |     |      r      |          | Used for Swagger + outbound media URLs Meta downloads                                   |
| `CREDENTIAL_ENCRYPTION_KEY`                                                             |  R  |     |             |          | **Exactly 64 hex chars**. AES-256-GCM. Generate with `openssl rand -hex 32`             |
| `META_APP_ID`                                                                           |  r  |     |             |          | Required only if testing Messenger                                                      |
| `META_APP_SECRET`                                                                       |  r  |     |             |          | Same                                                                                    |
| `INTERNAL_API_TOKEN`                                                                    |  r  |     |      R      |          | Shared secret for `/internal/*` calls between tenant-site and API                       |
| `REVALIDATE_SECRET`                                                                     |  r  |     |      R      |          | API → tenant-site `/api/revalidate`                                                     |
| `TENANT_SITE_INTERNAL_URL`                                                              |  r  |     |             |          | API uses this to POST revalidations. Compose: `http://tenant-site:3100`                 |
| `TENANT_SITE_PUBLIC_URL`                                                                |  r  |     |      R      |          | Public preview URL. Dev: `http://tenant.local.test`                                     |
| `PREVIEW_TOKEN_SECRET`                                                                  |  r  |     |             |          | HMAC for site-editor preview iframe tokens                                              |
| `API_INTERNAL_URL`                                                                      |     |     |      R      |          | Tenant-site → API server-to-server. Compose: `http://api:4000/api/v1`                   |
| `NEXT_PUBLIC_API_URL`                                                                   |     |  R  |             |          | Baked into web at build time. Local: `http://localhost:4000/api/v1`                     |
| `NEXT_PUBLIC_APP_ENV`                                                                   |     |  o  |             |          | `development` / `staging` / `production`                                                |
| `NEXT_PUBLIC_APP_URL`                                                                   |     |  o  |             |          | Used for cross-link generation in web                                                   |
| `SEED_PLATFORM_ADMIN_USERNAME`                                                          |  r  |     |             |          | Read by seeder                                                                          |
| `SEED_PLATFORM_ADMIN_PASSWORD`                                                          |  r  |     |             |          |                                                                                         |
| `SEED_INCLUDE_RUBY` / `SEED_INCLUDE_TEST` / `SEED_INCLUDE_DEMO`                         |  o  |     |             |          | Toggle which fixture tenants get seeded                                                 |
| `SEED_TENANTS`                                                                          |  o  |     |             |          | CSV `slug:Name:password` for ad-hoc tenants                                             |
| `SEED_TENANT_PASSWORD`                                                                  |  o  |     |             |          | Default password for `SEED_TENANTS` entries                                             |
| `SEED_MODE`                                                                             |  o  |     |             |          | `development` (default) or `production`                                                 |
| `AWS_REGION` / `PHOTOS_S3_BUCKET` / `PHOTOS_PUBLIC_URL_PREFIX` / `PHOTOS_S3_KEY_PREFIX` |  r  |     |             |          | S3 media. Required in staging/prod; optional in dev (presign disabled if unset)         |
| `AI_REPLY_API_KEY`                                                                      |  r  |     |             |          | Google AI Studio key for Gemini auto-replies. Without it, AI reply is skipped silently. |
| `AI_REPLY_PROVIDER` / `AI_REPLY_MODEL` / `AI_REPLY_BASE_URL`                            |  o  |     |             |          | Defaults: `GEMINI_API`, `gemini-2.5-flash`                                              |
| `AI_REPLY_ENABLED_DEFAULT`                                                              |  o  |     |             |          | New tenants get AI on by default                                                        |
| `BRAINTRUST_API_KEY`                                                                    |  o  |     |             |          | Eval logging — leave empty in dev                                                       |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`                     |  r  |     |             |          | Required only if testing form-submission emails. Dev falls back to Ethereal if unset.   |
| `RBAC_ENFORCE`                                                                          |  o  |     |             |          | `true` in staging; can stay unset locally                                               |
| `IMS_DEPLOYMENT_TIER`                                                                   |  o  |     |             |          | Free-form label for runbooks                                                            |
| `FEATURE_FLAGS`                                                                         |  o  |     |             |          | Comma-list of flag overrides                                                            |

## Generate secrets first (one-time)

Run these and paste the outputs into the `.env` you'll create next:

```bash
# CREDENTIAL_ENCRYPTION_KEY  (exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET, JWT_REFRESH_SECRET, INTERNAL_API_TOKEN,
# REVALIDATE_SECRET, PREVIEW_TOKEN_SECRET (any length, but 32+ chars recommended)
for i in 1 2 3 4 5; do node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; done
```

## Create the root `.env`

`/Users/roshanpandey/PROJECTS/shaman/projectX/.env`:

```dotenv
# =============================================================================
# Local dev (docker-compose.dev.yml). Source-of-truth for API vars:
# apps/api/src/config/env.ts (zod schema).
# Reference: ssh ims_dev "cat ~/deploy/.env"
# =============================================================================

# -------- Postgres (init values for the postgres container) --------
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ims

# -------- API: core --------
NODE_ENV=development
APP_ENV=development
PORT=4000
HOST=0.0.0.0

# Inside the docker network, the DB host is the compose service name `postgres`.
# (If you ever run the API on the host with `pnpm --filter api dev`, swap to localhost.)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ims?schema=public
REDIS_URL=redis://redis:6379

# -------- API: auth --------
JWT_SECRET=__paste_generated_secret_1__
JWT_REFRESH_SECRET=__paste_generated_secret_2__
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=30d

# -------- API: networking --------
# Dev defaults already include localhost:3000/3001 if you leave CORS_ORIGIN unset,
# but being explicit avoids surprise once you change NODE_ENV.
CORS_ORIGIN=http://localhost:3000,http://app.local.test,https://app.local.test
API_PUBLIC_URL=http://localhost:4000/api/v1

# -------- API: credential encryption (REQUIRED, 64 hex chars) --------
CREDENTIAL_ENCRYPTION_KEY=__paste_64_hex_chars__

# -------- API: tenant-site coordination --------
INTERNAL_API_TOKEN=__paste_generated_secret_3__
REVALIDATE_SECRET=__paste_generated_secret_4__
PREVIEW_TOKEN_SECRET=__paste_generated_secret_5__
TENANT_SITE_INTERNAL_URL=http://tenant-site:3100
TENANT_SITE_PUBLIC_URL=http://tenant.local.test

# -------- Seed (run automatically on first API boot by dev-api-entrypoint.sh) --------
SEED_MODE=development
SEED_PLATFORM_ADMIN_USERNAME=platform
SEED_PLATFORM_ADMIN_PASSWORD=platform123
SEED_INCLUDE_RUBY=true
SEED_RUBY_PASSWORD=admin123
# Optional extras:
# SEED_INCLUDE_DEMO=true
# SEED_INCLUDE_TEST=true
# SEED_TENANTS=acme:Acme Corp,demo:Demo Tenant
# SEED_TENANT_PASSWORD=admin123

# -------- API: Messenger (leave blank unless you're testing Meta integration) --------
META_APP_ID=
META_APP_SECRET=

# -------- API: AI auto-replies (leave blank to disable cleanly) --------
AI_REPLY_PROVIDER=GEMINI_API
AI_REPLY_API_KEY=
AI_REPLY_MODEL=gemini-2.5-flash
AI_REPLY_ENABLED_DEFAULT=false
# BRAINTRUST_API_KEY=
# BRAINTRUST_PROJECT_NAME=IMS AI Replies

# -------- API: S3 media (optional in dev — presign disabled if unset) --------
# AWS_REGION=ap-south-1
# PHOTOS_S3_BUCKET=ims-shaman-photos-dev
# PHOTOS_PUBLIC_URL_PREFIX=https://ims-shaman-photos-dev.s3.ap-south-1.amazonaws.com/
# PHOTOS_S3_KEY_PREFIX=dev
# PHOTOS_S3_VERIFY_ON_STARTUP=0

# -------- Web (Next.js) — baked at build time, also read at runtime --------
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -------- Tenant site (read by apps/tenant-site at runtime) --------
API_INTERNAL_URL=http://api:4000/api/v1
# REVALIDATE_SECRET, INTERNAL_API_TOKEN, TENANT_SITE_PUBLIC_URL are reused
# from the API section above — env_file: .env in compose loads them all into
# every service that asks for them.
```

> **Do not commit this file.** `.env` should be in `.gitignore` already. Confirm with `git check-ignore .env`.

## Handle the stage URL leak in `apps/web/.env`

`apps/web/.env` currently points at the stage API:

```bash
$ cat apps/web/.env
NEXT_PUBLIC_API_URL=https://stage-api.shamankathmandu.com/api/v1
NODE_ENV=production
```

Next.js loads `.env` **before** `.env.local`, then `process.env` from the container overrides both. With `env_file: .env` in compose, the root `.env` wins **at runtime** — but `next dev` reads `apps/web/.env` directly when building the client bundle, so the wrong URL ends up in the browser.

Fix once:

```bash
mv apps/web/.env apps/web/.env.stage.bak
```

`apps/web/.env.local` already has `http://localhost:4000/api/v1` and stays.

## Handle the inconsistent `apps/api/.env`

Currently:

```bash
$ cat apps/api/.env
POSTGRES_DB=appdb           # ← root says `ims`
DATABASE_URL=...localhost:5432/appdb?schema=public
```

This is only used when running the API on the host (`pnpm --filter api dev` outside docker). For the docker stack it's ignored. But to avoid future confusion:

```bash
mv apps/api/.env apps/api/.env.hostpnpm.bak
```

If you do want to run the API on the host later, restore it and change `POSTGRES_DB` and `DATABASE_URL` to match the root `.env` (`ims`), with host = `localhost` instead of `postgres`.

## Verify before going further

```bash
# .env exists at repo root and isn't tracked
ls -la .env && git check-ignore -v .env

# All required vars are filled in (no leftover __paste_* placeholders)
grep -E "__paste|=$" .env || echo "OK — no empty required vars"

# CREDENTIAL_ENCRYPTION_KEY is exactly 64 hex chars (or the API exits)
awk -F= '/^CREDENTIAL_ENCRYPTION_KEY=/{print length($2)}' .env
# → must print 64
```

## Comparing to `ims_dev` (staging reference)

To compare your local env keys against staging:

```bash
ssh ims_dev "cat ~/deploy/.env" | grep -oE '^[A-Z_]+=' | sort -u > /tmp/dev-keys
grep -oE '^[A-Z_]+=' .env | sort -u > /tmp/local-keys
diff /tmp/dev-keys /tmp/local-keys
```

Staging has these that local **doesn't need**: `META_APP_SECRET` (real), `AI_REPLY_API_KEY` (real), `BRAINTRUST_API_KEY`, `AWS_REGION` + `PHOTOS_*`, `TENANT_DOMAIN_TARGET_IP`. Add them only if you're testing those specific features locally.

Local has these that staging doesn't: nothing should be exclusive — if you find a local-only key, double-check it's not a typo against `apps/api/src/config/env.ts`.

---

# Step 2 — Replace `docker-compose.dev.yml`

Overwrite `/Users/roshanpandey/PROJECTS/shaman/projectX/docker-compose.dev.yml`:

```yaml
# Local dev: hot reload + full stack mirror of ims_dev.
# Usage:
#   docker compose -f docker-compose.dev.yml --profile websites up -d
#   docker compose -f docker-compose.dev.yml logs -f api
#   docker compose -f docker-compose.dev.yml down

services:
  postgres:
    image: postgres:16
    container_name: dev_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports: ["5432:5432"]
    volumes:
      - dev_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks: [dev]

  redis:
    image: redis:7-alpine
    container_name: dev_redis
    restart: unless-stopped
    ports: ["6379:6379"]
    volumes:
      - dev_redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks: [dev]

  api:
    image: node:20-alpine
    container_name: dev_api
    restart: unless-stopped
    working_dir: /app
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    ports: ["4000:4000"]
    env_file: [.env]
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    volumes:
      - .:/app
      - dev_root_node_modules:/app/node_modules
      - dev_api_node_modules:/app/apps/api/node_modules
    command: sh -c "/app/scripts/dev-api-entrypoint.sh"
    networks: [dev]

  web:
    image: node:20-alpine
    container_name: dev_web
    restart: unless-stopped
    working_dir: /app
    depends_on: [api]
    ports: ["3000:3000"]
    env_file: [.env]
    environment:
      WATCHPACK_POLLING: "true"
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - .:/app
      - dev_root_node_modules:/app/node_modules
      - dev_web_node_modules:/app/apps/web/node_modules
      - dev_web_next:/app/apps/web/.next
    command: sh -c "corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile && pnpm --filter web dev"
    networks: [dev]

  tenant-site:
    image: node:20-alpine
    container_name: dev_tenant_site
    restart: unless-stopped
    working_dir: /app
    profiles: ["websites"]
    depends_on: [api]
    ports: ["3100:3100"]
    env_file: [.env]
    environment:
      PORT: "3100"
      HOSTNAME: "0.0.0.0"
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - dev_root_node_modules:/app/node_modules
      - dev_tenant_node_modules:/app/apps/tenant-site/node_modules
      - dev_tenant_next:/app/apps/tenant-site/.next
    command: sh -c "corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile && pnpm --filter tenant-site dev"
    networks: [dev]

  caddy:
    image: caddy:2.8-alpine
    container_name: dev_caddy
    restart: unless-stopped
    profiles: ["websites"]
    ports:
      - "80:80"
      - "443:443"
    depends_on: [web, api, tenant-site]
    volumes:
      - ./deploy/dev/Caddyfile.local:/etc/caddy/Caddyfile:ro
      - dev_caddy_data:/data
      - dev_caddy_config:/config
    networks: [dev]

networks:
  dev:
    name: ims-dev-local

volumes:
  dev_pg_data:
  dev_redis_data:
  dev_root_node_modules:
  dev_api_node_modules:
  dev_web_node_modules:
  dev_web_next:
  dev_tenant_node_modules:
  dev_tenant_next:
  dev_caddy_data:
  dev_caddy_config:
```

Key points:

- Uses raw `node:20-alpine` — no custom dev image needed.
- Bind-mounts the whole repo at `/app`, but **shadows** `node_modules` with named volumes so the host's `node_modules` (built for macOS) doesn't clobber the Linux-built one inside the container.
- `pnpm install --frozen-lockfile` runs on first start in each container; subsequent starts are fast (volume is cached).

---

# Step 3 — API dev entrypoint (auto migrate + seed)

Create `/Users/roshanpandey/PROJECTS/shaman/projectX/scripts/dev-api-entrypoint.sh`:

```sh
#!/bin/sh
set -e

cd /app

echo "[dev_api] Enabling pnpm…"
corepack enable
corepack prepare pnpm@9.12.0 --activate

echo "[dev_api] Installing deps…"
pnpm install --frozen-lockfile

echo "[dev_api] Generating Prisma client…"
pnpm --filter api exec prisma generate --schema=apps/api/prisma/schema.prisma

echo "[dev_api] Waiting for Postgres…"
until node -e "
  const { hostname, port } = new URL(process.env.DATABASE_URL);
  require('net').createConnection({ host: hostname, port: Number(port||5432) })
    .on('connect', () => process.exit(0))
    .on('error',   () => process.exit(1));
" 2>/dev/null; do
  sleep 1
done

echo "[dev_api] Running migrations…"
pnpm --filter api exec prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# Idempotent seed: only run if platform admin doesn't exist.
echo "[dev_api] Checking seed state…"
NEEDS_SEED=$(pnpm --filter api --silent exec node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.user.count({ where: { username: process.env.SEED_PLATFORM_ADMIN_USERNAME } })
    .then(n => { console.log(n === 0 ? 'yes' : 'no'); return p.\$disconnect(); })
    .catch(() => { console.log('yes'); });
" | tail -n1)

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "[dev_api] Seeding…"
  pnpm --filter api exec node prisma/seed.js
else
  echo "[dev_api] Seed already present — skipping."
fi

echo "[dev_api] Starting API in watch mode…"
exec pnpm --filter api dev
```

Make it executable:

```bash
chmod +x scripts/dev-api-entrypoint.sh
```

> If your seed model isn't `user` or the username field differs, adjust the `NEEDS_SEED` check. Grep `apps/api/prisma/schema.prisma` for the admin/user model to confirm.

---

# Step 4 — Caddyfile for local host-header routing

Create `/Users/roshanpandey/PROJECTS/shaman/projectX/deploy/dev/Caddyfile.local`:

```caddyfile
{
    # Local dev: skip ACME, use internal certs (browser will warn — accept once).
    local_certs
    auto_https disable_redirects
}

# Admin UI
localhost, app.local.test {
    tls internal
    reverse_proxy web:3000
}

# API
api.local.test {
    tls internal
    reverse_proxy api:4000
}

# Tenant sites — anything else goes to the tenant renderer.
# The tenant-site middleware resolves tenant by Host header.
*.local.test, tenant.local.test {
    tls internal
    reverse_proxy tenant-site:3100
}
```

Add hostnames to `/etc/hosts` (one time):

```bash
sudo tee -a /etc/hosts >/dev/null <<'EOF'
127.0.0.1 app.local.test
127.0.0.1 api.local.test
127.0.0.1 tenant.local.test
127.0.0.1 demo.local.test
127.0.0.1 ruby.local.test
EOF
```

---

# Step 5 — Bring it up

From repo root:

```bash
# First time (or after dep changes): build + start everything including websites profile
docker compose -f docker-compose.dev.yml --profile websites up -d

# Watch API come up (will take ~60s first run: pnpm install + migrate + seed)
docker compose -f docker-compose.dev.yml logs -f api
```

Expected log sequence in `api`:

```
[dev_api] Enabling pnpm…
[dev_api] Installing deps…
[dev_api] Generating Prisma client…
[dev_api] Waiting for Postgres…
[dev_api] Running migrations…
[dev_api] Checking seed state…
[dev_api] Seeding…
[dev_api] Starting API in watch mode…
```

Verify:

```bash
curl -sf http://localhost:4000/health && echo " api ok"
curl -sf http://localhost:3000/        >/dev/null && echo " web ok"
curl -sf http://localhost:3100/healthz && echo " tenant-site ok"
```

Open:

- `http://localhost:3000` — admin web
- `https://app.local.test` — admin via Caddy (accept TLS warning)
- `https://ruby.local.test` — tenant site via Caddy
- `http://localhost:4000/api/docs` — Swagger

Log in with `platform` / `platform123` (or whatever you set in `.env`).

---

# Common ops

```bash
# Tail logs for one service
docker compose -f docker-compose.dev.yml logs -f api

# Restart one service (e.g. after .env edit)
docker compose -f docker-compose.dev.yml restart api

# Open a shell inside the api container
docker compose -f docker-compose.dev.yml exec api sh

# Run a prisma command
docker compose -f docker-compose.dev.yml exec api \
  pnpm --filter api exec prisma migrate dev --name my_change \
       --schema=apps/api/prisma/schema.prisma

# Re-seed from scratch
docker compose -f docker-compose.dev.yml exec api \
  pnpm --filter api exec node prisma/seed.js

# Nuke DB only (keep node_modules cache)
docker compose -f docker-compose.dev.yml down
docker volume rm projectx_dev_pg_data
docker compose -f docker-compose.dev.yml --profile websites up -d

# Full reset (DB + node_modules caches)
docker compose -f docker-compose.dev.yml down -v
```

---

# Troubleshooting

| Symptom                               | Cause                                  | Fix                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the Docker daemon` | Docker Desktop not running             | `open -a Docker`, wait for the whale icon                                                                                                                            |
| API exits with `CORS_ORIGIN required` | `.env` not loaded                      | Confirm `.env` exists at repo root; restart `api`                                                                                                                    |
| Web shows stage API URL               | `apps/web/.env` baked in at build      | Rename it: `mv apps/web/.env apps/web/.env.stage.bak`; restart `web`                                                                                                 |
| `pnpm install` looping in container   | host `node_modules` mounted            | The `dev_*_node_modules` named volumes prevent this — confirm they're declared                                                                                       |
| `prisma migrate deploy` says `P3009`  | Half-applied migration                 | `docker compose ... exec api pnpm --filter api exec prisma migrate resolve --rolled-back <name>`                                                                     |
| Tenant site 404 for `ruby.local.test` | Tenant not seeded or host header wrong | Check seed ran (`SEED_INCLUDE_RUBY=true`); confirm `/etc/hosts` entry                                                                                                |
| Caddy TLS warning                     | `tls internal` (self-signed)           | Expected. Click through, or `mkcert` later if you want trusted local certs                                                                                           |
| File edits don't trigger reload       | Polling disabled                       | We already set `CHOKIDAR_USEPOLLING=true` / `WATCHPACK_POLLING=true`; confirm env actually reached the container with `docker compose ... exec web env \| grep POLL` |

---

# When this guide gets stale

The bits most likely to drift:

- **pnpm version** in container `sh -c` commands. Keep in sync with `packageManager` in root `package.json`.
- **Seed env var names** (`SEED_PLATFORM_ADMIN_USERNAME`, etc.) — source of truth is `apps/api/prisma/seed.ts` JSDoc.
- **Required API env vars** — source of truth is `apps/api/src/config/env.ts` (zod schema). If API exits at startup demanding a var, add it to the `.env` template above.
- **Redis dependency** — if API stops using BullMQ, the redis service can be removed.

Future Claude: before recommending changes from this guide, verify file paths (`scripts/dev-api-entrypoint.sh`, `deploy/dev/Caddyfile.local`) still exist and the compose service names still match. The guide is a snapshot, not a contract.
