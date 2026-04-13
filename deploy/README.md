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
│   ├── setup-backups.sh   # One-time: AWS CLI + cron for nightly S3 offsite sync
│   ├── backup-s3.sh       # Sync DB dumps (+ dev: .env) to S3 (cron or manual)
│   ├── migrate-deploy.sh  # One-off prisma migrate deploy via dev_api image
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
    ├── setup-backups.sh   # One-time: AWS CLI + cron for nightly S3 offsite sync
    ├── backup-s3.sh       # Sync DB dumps, uploads volume, .env to S3 (cron or manual)
    ├── migrate-deploy.sh  # One-off prisma migrate deploy via prod_api image
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
./setup-backups.sh     # optional: S3 offsite backups (needs IAM instance profile on EC2)
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
./setup-backups.sh     # optional: S3 offsite backups (needs IAM instance profile on EC2)
```

---

## Script Reference

Run all scripts from `/home/ubuntu/deploy/` (they resolve their own directory automatically):

| Script              | Usage                             | Description                                                                                   |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `setup.sh`          | `./setup.sh`                      | First-time setup: .env, docker login, validation                                              |
| `up.sh`             | `./up.sh`                         | Start app stack + watchtower                                                                  |
| `down.sh`           | `./down.sh`                       | Stop everything (volumes preserved)                                                           |
| `down.sh`           | `./down.sh --volumes`             | Stop + delete volumes (**data loss!**)                                                        |
| `restart.sh`        | `./restart.sh`                    | Restart all services                                                                          |
| `restart.sh`        | `./restart.sh api`                | Restart one service (api/web/db/redis/backup/watchtower)                                      |
| `logs.sh`           | `./logs.sh`                       | Last 100 lines from all services                                                              |
| `logs.sh`           | `./logs.sh api -f`                | Follow API logs                                                                               |
| `logs.sh`           | `./logs.sh api --tail 50`         | Last 50 lines from API                                                                        |
| `status.sh`         | `./status.sh`                     | Container status + CPU/mem + disk usage                                                       |
| `health.sh`         | `./health.sh`                     | Quick health probe (exits 0=pass, 1=fail)                                                     |
| `setup-nginx.sh`    | `sudo ./setup-nginx.sh`           | Install nginx + certbot + HTTPS certs                                                         |
| `seed.sh`           | `./seed.sh`                       | Interactive DB seed (see below)                                                               |
| `seed.sh`           | `./seed.sh --reset`               | **Dev only** — `prisma migrate reset` then seed (destructive)                                 |
| `backup-db.sh`      | `./backup-db.sh`                  | On-demand manual DB dump **(prod only)** → `/home/ubuntu/backups`                             |
| `migrate-deploy.sh` | `./migrate-deploy.sh`             | Run `prisma migrate deploy` once using the **same** API image as Compose (dev or prod folder) |
| `setup-backups.sh`  | `./setup-backups.sh`              | **Dev & prod** — install `awscli`, verify IAM, cron @ 02:00 for `./backup-s3.sh`              |
| `backup-s3.sh`      | `BACKUPS_BUCKET=b ./backup-s3.sh` | **Dev & prod** — push local backups to S3 (see [Offsite backups (S3)](#offsite-backups-s3))   |

### Database seed (`./seed.sh`)

On EC2, **`./seed.sh` is the supported way** to seed Postgres inside Docker. It runs `node prisma/seed.js --orchestrated` from `apps/api` in the API container and **inlines** `SEED_INCLUDE_*` / `SEED_MODE` / optional `SEED_MINIMAL_TENANTS_B64` in the shell command so choices are not dropped (some Docker setups do not apply `docker compose exec -e` to the seed process; platform credentials still come from the container `.env` via Compose `env_file`).

- **Always created:** plan limits + platform admin (`SEED_PLATFORM_ADMIN_USERNAME` / `SEED_PLATFORM_ADMIN_PASSWORD` in `.env`).
- **Optional (prompts):** full `test1` / `test2` data, minimal `ruby` tenant, full `demo` tenant, and an optional comma-separated minimal tenant list (`slug:Name` or `slug:Name:password`).
- **Prod:** same prompts after you type `yes` to proceed; read warnings before including sample tenants.

Local or CI without this script can still use `pnpm --filter api prisma:seed` (legacy `SEED_PROFILE` / `SEED_MODE` — see `apps/api/prisma/seed.ts`).

**Remove sample tenants by slug (FK-safe):** do not use raw `prisma.tenant.delete()` — `transfer_logs.user_id` is `Restrict` and will fail. After pulling an image that includes `apps/api/prisma/delete-tenants-by-slug.cjs`:

```bash
docker compose exec prod_api sh -c 'cd /app/apps/api && node prisma/delete-tenants-by-slug.cjs test1 test2 demo ruby'
```

Local: `pnpm --filter api delete-tenants -- test1 test2 demo ruby`

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

## Database Backups

### Local backups (dev & prod)

Both stacks include a **`postgres-backup-local`** sidecar (`dev_db_backup` / `prod_db_backup`) that writes scheduled dumps to the host.

| Env  | Container        | Host path               |
| ---- | ---------------- | ----------------------- |
| Dev  | `dev_db_backup`  | `/home/ubuntu/backups/` |
| Prod | `prod_db_backup` | `/home/ubuntu/backups/` |

- **Retention** (container default): 7 daily + 4 weekly + 3 monthly
- **Format**: gzipped SQL (`.sql.gz`)
- **Survives** `docker compose down --volumes` (bind mount on the EC2 disk — not in the DB volume)

**Prod only — extra manual dumps:** run `./backup-db.sh` before migrations or risky deploys (keeps last 14 manual files in the same directory).

### Restore from a local `.sql.gz` (prod example)

```bash
cd /home/ubuntu/deploy
gunzip -c /home/ubuntu/backups/<backup-file>.sql.gz | \
  docker compose exec -T prod_db psql -U postgres -d ims
```

(Use `dev_db` instead of `prod_db` on staging.)

### One-off `migrate deploy` (dev / prod)

The API container **already runs** `prisma migrate deploy` on every start (`apps/api/docker-entrypoint.sh`). Use `./migrate-deploy.sh` when you want to apply pending migrations **without** restarting the long-running Node process, or to verify migrations against the DB using the **exact** migration files baked into the current pulled image:

```bash
cd /home/ubuntu/deploy
./migrate-deploy.sh
```

**Rule:** The migration files inside the API image must match the rows in `_prisma_migrations` (Prisma stores checksums). If you apply migrations from a **newer** git tree than the running image (e.g. ad-hoc fix), **rebuild and deploy the API image from that same commit** immediately so the app binary and Prisma client match the database schema.

### Failed Prisma migrations (P3009)

**Symptom:** API container exits in a loop; logs show `migrate deploy` failed and `P3009` / “failed migrations in the target database”.

**Typical causes:** invalid SQL in a migration (e.g. foreign key referencing a non-existent referenced column), or a partially applied migration after a crash.

**Before changing production data:** run `./backup-db.sh` (prod) or rely on recent `postgres-backup-local` dumps.

**Recovery (outline):**

1. Inspect the failed row:  
   `docker compose exec -T prod_db psql -U postgres -d ims -c "SELECT migration_name, logs FROM _prisma_migrations WHERE finished_at IS NULL;"`  
   (use `dev_db` on staging).

2. If Postgres **rolled back** the migration transaction (common), the schema may have no partial objects. Mark the migration as rolled back, fix the migration SQL **in git**, redeploy an image that contains the fix, then run `migrate deploy` again:  
   `npx prisma migrate resolve --rolled-back "<migration_folder_name>"`  
   (run with the same `DATABASE_URL` and `prisma/migrations` as your release). See [Prisma: production troubleshooting](https://pris.ly/d/migrate-resolve).

3. If the migration **partially** applied (objects left in the DB), you must manually align the database with what Prisma expects, or roll back objects, **then** `migrate resolve` and redeploy. When in doubt, restore from backup and replay migrations from a corrected image.

**Prevention:** CI runs `prisma migrate deploy` on a fresh Postgres database for API tests; merged migrations must apply cleanly. Review raw SQL for FK targets (`tenants` → always reference `"id"`).

---

## Offsite backups (S3)

Nightly **offsite** sync is optional. Scripts live in each deploy folder: `setup-backups.sh` (one-time) and `backup-s3.sh` (actual sync).

### Prerequisites

- EC2 **IAM instance profile** with permission to write to the backup bucket (e.g. Terraform attaches `ims-ec2-backup-profile`).
- **S3 bucket** (default name: `ims-shaman-backups`, override with `BACKUPS_BUCKET`).
- **Region** defaults to `ap-south-1` (`AWS_DEFAULT_REGION`).

### One-time setup (dev or prod)

```bash
cd /home/ubuntu/deploy
./setup-backups.sh
```

This installs `awscli` if needed, runs `aws sts get-caller-identity`, chmods `backup-s3.sh`, and adds a **daily cron at 02:00** that logs to `/home/ubuntu/backups/s3-sync.log`.

**Test immediately:**

```bash
cd /home/ubuntu/deploy
BACKUPS_BUCKET=ims-shaman-backups ./backup-s3.sh
tail -f /home/ubuntu/backups/s3-sync.log   # after first cron run
```

### What `backup-s3.sh` uploads

| Prefix (under bucket)     | Contents                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `dev/db/` or `prod/db/`   | Everything under `/home/ubuntu/backups/` except `s3-sync.log` (`aws s3 sync` with `--delete`)                  |
| `prod/uploads/`           | Docker volume **`prod_uploads`** (API file uploads) — **prod script only**                                     |
| `dev/env/` or `prod/env/` | Timestamped copy of `/home/ubuntu/deploy/.env` (`.env.YYYYMMDD-HHMMSS`); keeps last **30** env snapshots in S3 |

**Dev** `backup-s3.sh` syncs **DB dumps + `.env` only** (no uploads volume).

**Prod** `backup-s3.sh` additionally syncs the **`prod_uploads`** named volume mount (resolves `deploy_prod_uploads` or any `*prod_uploads` volume).

### Environment overrides (optional)

You can set these when running the script or in the cron line (see `setup-backups.sh`):

| Variable             | Default              | Purpose                 |
| -------------------- | -------------------- | ----------------------- |
| `BACKUPS_BUCKET`     | `ims-shaman-backups` | Target S3 bucket        |
| `AWS_DEFAULT_REGION` | `ap-south-1`         | AWS region for CLI / S3 |

---

## Environment Variables

Every var consumed by the API is documented in `.env.example`. Critical vars that cause an **immediate API exit** if missing in staging/production:

| Variable                   | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`             | Prisma connection string — host must be the docker service name   |
| `JWT_SECRET`               | Auth token signing key                                            |
| `CORS_ORIGIN`              | Allowed CORS origin (must match the web domain)                   |
| `API_PUBLIC_URL`           | Public API base URL (Swagger + media links for Messenger)         |
| `AWS_REGION`               | Required with tenant media S3 settings below                      |
| `PHOTOS_S3_BUCKET`         | S3 bucket for tenant uploads                                      |
| `PHOTOS_PUBLIC_URL_PREFIX` | Public base URL for objects (usually `https://bucket.s3.../`)     |
| `PHOTOS_S3_KEY_PREFIX`     | Must be `dev`, `stage`, or `prod` (isolates keys per environment) |

**Facebook Messenger specific:**

| Variable                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `META_APP_ID`               | Meta App ID from the App Dashboard               |
| `META_APP_SECRET`           | Verifies `X-Hub-Signature-256` on webhook POSTs  |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM key for stored channel access tokens |

**AI auto-replies (optional — Gemini by default):**

| Variable            | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `AI_REPLY_API_KEY`  | Google AI Studio / Gemini API key; if empty, auto-reply is skipped |
| `AI_REPLY_PROVIDER` | Default `GEMINI_API`                                               |
| `AI_REPLY_MODEL`    | Default `gemini-2.5-flash`                                         |

**Database seed (`.env` on EC2):**

| Variable                       | Description                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_PLATFORM_ADMIN_PASSWORD` | **Required** for `./seed.sh` — platform admin password                                                                            |
| `SEED_PLATFORM_ADMIN_USERNAME` | Optional (default `platform`)                                                                                                     |
| `SEED_TENANT_PASSWORD`         | Default admin password for minimal tenants when the list omits `:password` (optional; script defaults to `ChangeMe123!` if unset) |

`SEED_MODE`, `SEED_PROFILE`, and `SEED_TENANTS` are **not** used by `./seed.sh`; they apply only to legacy `pnpm prisma:seed` / local runs.

**S3 offsite backup (EC2 host / cron only — not consumed by the API):**

| Variable             | Default              | Description                                                                 |
| -------------------- | -------------------- | --------------------------------------------------------------------------- |
| `BACKUPS_BUCKET`     | `ims-shaman-backups` | Set in cron by `setup-backups.sh` or override when testing `./backup-s3.sh` |
| `AWS_DEFAULT_REGION` | `ap-south-1`         | Region for `aws s3 sync` / `aws s3 cp`                                      |

---

## Troubleshooting

| Symptom                         | Fix                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Containers exit on start        | `./logs.sh api` — check for missing env vars in `.env`                                                                                                                    |
| API returns 401 on webhook POST | `META_APP_SECRET` wrong/missing, or `proxy_request_buffering` is on — re-run `sudo ./setup-nginx.sh`                                                                      |
| Socket.IO connections fail      | Check `location /ws/` has `Upgrade`/`Connection` headers in nginx; `./logs.sh api -f` for errors                                                                          |
| Uploads > 1MB return 413        | nginx `client_max_body_size` not applied — re-run `sudo ./setup-nginx.sh`                                                                                                 |
| Watchtower can't pull images    | Run `docker login` on the EC2 instance                                                                                                                                    |
| Nginx 502 Bad Gateway           | Containers not running on `localhost:3000`/`4000` — check `./status.sh`                                                                                                   |
| 301 redirect loop (Cloudflare)  | nginx uses `X-Forwarded-Proto` to avoid double-redirect; set Cloudflare to "Full" SSL mode                                                                                |
| Certbot fails                   | DNS A records must point to this EC2's public IP before certbot runs                                                                                                      |
| `Network ims-dev not found`     | Run `./up.sh` first to create the network, then Watchtower connects to it                                                                                                 |
| S3 backup / `aws` errors        | Ensure IAM instance profile is attached; run `aws sts get-caller-identity`. Check `tail -f /home/ubuntu/backups/s3-sync.log`                                              |
| `prod_uploads` not syncing      | **Prod:** stack must have created the volume; run `./backup-s3.sh` after `./up.sh`. Volume name may differ — script tries `deploy_prod_uploads` or `*prod_uploads`        |
| API loop / `P3009` migrations   | See [Failed Prisma migrations (P3009)](#failed-prisma-migrations-p3009); fix DB + `migrate resolve`, then ship an image built from the same commit as `prisma/migrations` |

---

## Full Deployment Guide

See [docs/SERVER-DEPLOYMENT.md](../docs/SERVER-DEPLOYMENT.md) for CI/CD pipeline details, rollback procedures, and infra setup.
