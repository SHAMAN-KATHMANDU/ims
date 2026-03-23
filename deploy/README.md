# Deploy

Server deployment configs and scripts for Dev/Stage and Production EC2 instances.

Each environment folder is **fully self-contained** — SCP only the folder you need:

```
deploy/
├── README.md
├── dev/               # Dev/Stage EC2 — copy this folder to the dev server
│   ├── functions.sh       # Bash helpers (sourced by all scripts in this folder)
│   ├── docker-compose.yml # App stack: postgres, redis, api, web
│   ├── watchtower.yml     # Auto-pull :dev images every 30s
│   ├── nginx.conf         # Reverse proxy with webhook + WebSocket support
│   ├── .env.example       # Comprehensive env template
│   ├── setup.sh           # First-time setup
│   ├── up.sh              # Start everything
│   ├── down.sh            # Stop everything
│   ├── restart.sh         # Restart one or all services
│   ├── logs.sh            # View / follow container logs
│   ├── status.sh          # Container status + resource usage
│   ├── health.sh          # Quick web + API health probe
│   ├── setup-nginx.sh     # Install nginx/certbot + HTTPS
│   └── seed.sh            # Interactive DB seed (orchestrated via Prisma)
└── prod/              # Production EC2 — copy this folder to the prod server
    ├── functions.sh       # Bash helpers (sourced by all scripts in this folder)
    ├── docker-compose.yml # App stack + automated daily DB backups
    ├── watchtower.yml     # Auto-pull :prod images every 30s
    ├── nginx.conf         # Reverse proxy with webhook + WebSocket support
    ├── .env.example       # Comprehensive env template
    ├── setup.sh           # First-time setup
    ├── up.sh              # Start everything
    ├── down.sh            # Stop everything
    ├── restart.sh         # Restart one or all services
    ├── logs.sh            # View / follow container logs
    ├── status.sh          # Container status + resource usage + backup info
    ├── health.sh          # Quick web + API health probe
    ├── setup-nginx.sh     # Install nginx/certbot + HTTPS
    ├── seed.sh            # Interactive DB seed (same flow as dev; confirm before prompts)
    └── backup-db.sh       # On-demand manual database backup
```

**Deployment is pull-based.** GitHub Actions builds and pushes Docker images to Docker Hub. Watchtower on each EC2 polls for new images and restarts containers automatically — no SSH from CI required.

---

## Quick Start

### Prerequisites

- Terraform applied, EC2 instances running, SSH key available
- Docker Hub images pushed (happens automatically after first CI run)
- DNS A records pointing to EC2 public IPs

### Copy deploy files to EC2

Each folder is self-contained — copy only the environment you need:

```bash
# Dev/Stage EC2 — copy only the dev/ folder
scp -i ~/.ssh/ims-aws -r deploy/dev/ ubuntu@<DEV_EC2_IP>:/home/ubuntu/deploy

# Prod EC2 — copy only the prod/ folder
scp -i ~/.ssh/ims-aws -r deploy/prod/ ubuntu@<PROD_EC2_IP>:/home/ubuntu/deploy
```

The files land at `/home/ubuntu/deploy/` on each server.

### Dev/Stage setup

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<DEV_EC2_IP>
cd /home/ubuntu/deploy
./setup.sh             # creates .env, docker login
./up.sh                # starts postgres + redis + api + web + watchtower
./health.sh            # verify everything is running
./seed.sh              # seed the database (first time only)
sudo ./setup-nginx.sh  # install nginx + HTTPS
```

### Production setup

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<PROD_EC2_IP>
cd /home/ubuntu/deploy
./setup.sh             # creates .env, docker login, creates /home/ubuntu/backups
./up.sh                # starts postgres + redis + api + web + backup + watchtower
./health.sh            # verify everything is running
./seed.sh              # seed the database (first time only)
sudo ./setup-nginx.sh  # install nginx + HTTPS
```

---

## Script Reference

Run all scripts from `/home/ubuntu/deploy/` (they resolve their own directory automatically):

| Script           | Usage                     | Description                                                   |
| ---------------- | ------------------------- | ------------------------------------------------------------- |
| `setup.sh`       | `./setup.sh`              | First-time setup: .env, docker login, validation              |
| `up.sh`          | `./up.sh`                 | Start app stack + watchtower                                  |
| `down.sh`        | `./down.sh`               | Stop everything (volumes preserved)                           |
| `down.sh`        | `./down.sh --volumes`     | Stop + delete volumes (**data loss!**)                        |
| `restart.sh`     | `./restart.sh`            | Restart all services                                          |
| `restart.sh`     | `./restart.sh api`        | Restart one service (api/web/db/redis/backup/watchtower)      |
| `logs.sh`        | `./logs.sh`               | Last 100 lines from all services                              |
| `logs.sh`        | `./logs.sh api -f`        | Follow API logs                                               |
| `logs.sh`        | `./logs.sh api --tail 50` | Last 50 lines from API                                        |
| `status.sh`      | `./status.sh`             | Container status + CPU/mem + disk usage                       |
| `health.sh`      | `./health.sh`             | Quick health probe (exits 0=pass, 1=fail)                     |
| `setup-nginx.sh` | `sudo ./setup-nginx.sh`   | Install nginx + certbot + HTTPS certs                         |
| `seed.sh`        | `./seed.sh`               | Interactive DB seed (see below)                               |
| `seed.sh`        | `./seed.sh --reset`       | **Dev only** — `prisma migrate reset` then seed (destructive) |
| `backup-db.sh`   | `./backup-db.sh`          | On-demand manual backup **(prod only)**                       |

### Database seed (`./seed.sh`)

On EC2, **`./seed.sh` is the supported way** to seed Postgres inside Docker. It runs `npx prisma db seed` from `apps/api` in the API container with `SEED_ORCHESTRATED=1`.

- **Always created:** plan limits + platform admin (`SEED_PLATFORM_ADMIN_USERNAME` / `SEED_PLATFORM_ADMIN_PASSWORD` in `.env`).
- **Optional (prompts):** full `test1` / `test2` data, minimal `ruby` tenant, full `demo` tenant, and an optional comma-separated minimal tenant list (`slug:Name` or `slug:Name:password`).
- **Prod:** same prompts after you type `yes` to proceed; read warnings before including sample tenants.

Local or CI without this script can still use `pnpm --filter api prisma:seed` (legacy `SEED_PROFILE` / `SEED_MODE` — see `apps/api/prisma/seed.ts`).

---

## Watchtower: Auto-Deploy Flow

```
Developer merges PR → GitHub Actions builds :dev image → pushes to Docker Hub
                                                               ↓
                                              Watchtower on dev EC2 polls every 30s
                                              Detects new :dev image → pulls → restarts dev_api / dev_web
```

```
ops/release tag → GitHub Actions builds :prod image → pushes to Docker Hub
                                                               ↓
                                              Watchtower on prod EC2 polls every 30s
                                              Detects new :prod image → pulls → restarts prod_api / prod_web
```

Watchtower only restarts `dev_api` / `dev_web` (or `prod_api` / `prod_web`). It never touches the database, Redis, or backup containers.

---

## Nginx: What's Proxied

Both `dev/nginx.conf` and `prod/nginx.conf` handle these paths on the API server block:

| Path                  | Notes                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/api/v1/webhooks/`   | Facebook Messenger webhooks. `proxy_request_buffering off` — raw body preserved for HMAC signature verification. |
| `/ws/`                | Socket.IO WebSocket. HTTP upgrade headers + 24h timeouts.                                                        |
| `/` (everything else) | REST API, Swagger, uploads, health. `client_max_body_size 15m` for uploads.                                      |

### Facebook Messenger Webhook Setup

1. After `sudo ./setup-nginx.sh` completes, your webhook URL is:
   - **Dev/Stage**: `https://stage-api.shamankathmandu.com/api/v1/webhooks/messenger`
   - **Prod**: `https://api.shamanyantra.com/api/v1/webhooks/messenger`

2. In the [Meta App Dashboard](https://developers.facebook.com/apps/):
   - Go to **Messenger → Webhooks**
   - Set **Callback URL** to the URL above
   - Set **Verify Token** to the per-channel token (generated when connecting a Messenger channel in the app)
   - Subscribe to: `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`

3. Set `META_APP_ID` and `META_APP_SECRET` in `.env`, then restart the API:
   ```bash
   ./restart.sh api
   ```

---

## Database Backups (Production)

Production has **two** backup mechanisms:

### 1. Automated (daily) — via `prod_db_backup` container

Included in `prod/docker-compose.yml`. Runs `pg_dump` on a daily cron schedule — no host crontab needed.

- **Retention**: 7 daily + 4 weekly + 3 monthly
- **Location**: `/home/ubuntu/backups/` (host bind mount — survives `docker compose down --volumes`)
- **Format**: gzipped SQL (`.sql.gz`)

### 2. On-demand (manual) — via `backup-db.sh`

Use before migrations or risky deployments:

```bash
./backup-db.sh
```

### Restore from backup

```bash
gunzip -c /home/ubuntu/backups/<backup-file>.sql.gz | \
  docker compose exec -T prod_db psql -U postgres -d ims
```

---

## Environment Variables

Every var consumed by the API is documented in `.env.example`. Critical vars that cause an **immediate API exit** if missing in staging/production:

| Variable         | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `DATABASE_URL`   | Prisma connection string — host must be the docker service name |
| `JWT_SECRET`     | Auth token signing key                                          |
| `CORS_ORIGIN`    | Allowed CORS origin (must match the web domain)                 |
| `API_PUBLIC_URL` | Public API base URL (Swagger + media links for Messenger)       |

**Facebook Messenger specific:**

| Variable                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `META_APP_ID`               | Meta App ID from the App Dashboard               |
| `META_APP_SECRET`           | Verifies `X-Hub-Signature-256` on webhook POSTs  |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM key for stored channel access tokens |

**Database seed (`.env` on EC2):**

| Variable                       | Description                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_PLATFORM_ADMIN_PASSWORD` | **Required** for `./seed.sh` — platform admin password                                                                            |
| `SEED_PLATFORM_ADMIN_USERNAME` | Optional (default `platform`)                                                                                                     |
| `SEED_TENANT_PASSWORD`         | Default admin password for minimal tenants when the list omits `:password` (optional; script defaults to `ChangeMe123!` if unset) |

`SEED_MODE`, `SEED_PROFILE`, and `SEED_TENANTS` are **not** used by `./seed.sh`; they apply only to legacy `pnpm prisma:seed` / local runs.

---

## Troubleshooting

| Symptom                         | Fix                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Containers exit on start        | `./logs.sh api` — check for missing env vars in `.env`                                               |
| API returns 401 on webhook POST | `META_APP_SECRET` wrong/missing, or `proxy_request_buffering` is on — re-run `sudo ./setup-nginx.sh` |
| Socket.IO connections fail      | Check `location /ws/` has `Upgrade`/`Connection` headers in nginx; `./logs.sh api -f` for errors     |
| Uploads > 1MB return 413        | nginx `client_max_body_size` not applied — re-run `sudo ./setup-nginx.sh`                            |
| Watchtower can't pull images    | Run `docker login` on the EC2 instance                                                               |
| Nginx 502 Bad Gateway           | Containers not running on `localhost:3000`/`4000` — check `./status.sh`                              |
| 301 redirect loop (Cloudflare)  | nginx uses `X-Forwarded-Proto` to avoid double-redirect; set Cloudflare to "Full" SSL mode           |
| Certbot fails                   | DNS A records must point to this EC2's public IP before certbot runs                                 |
| `Network ims-dev not found`     | Run `./up.sh` first to create the network, then Watchtower connects to it                            |

---

## Full Deployment Guide

See [docs/SERVER-DEPLOYMENT.md](../docs/SERVER-DEPLOYMENT.md) for CI/CD pipeline details, rollback procedures, and infra setup.
