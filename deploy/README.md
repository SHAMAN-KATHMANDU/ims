# Deploy to EC2 (Dev and Prod)

Copy this folder to each EC2 instance, create a `.env` file, then start the app stack and Watchtower.

**See [docs/SERVER-DEPLOYMENT.md](../docs/SERVER-DEPLOYMENT.md)** for the full server deployment guide (tag-based CI/CD, rollback, troubleshooting).

## Prerequisites

- Terraform has been applied and you have the **dev** and **prod** EC2 public IPs and SSH key path (see [infra/README.md](../infra/README.md)).
- Docker Hub images exist (e.g. after the first CI run): `rpandox/dev-api-ims:dev`, `rpandox/dev-web-ims:dev`, and same with `:prod`.

## 1. Log in to Docker Hub on each EC2 (once)

So Watchtower can pull your images (if they are private):

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<DEV_EC2_IP>
docker login
# Enter Docker Hub username and password (or access token), then exit.
```

Repeat for the prod instance.

## 2. Copy deploy files to EC2

From your **local machine** (in the repo root):

```bash
# Dev
scp -i ~/.ssh/ims-aws -r deploy/ ubuntu@43.204.67.93:/home/ubuntu/deploy

# Prod
scp -i ~/.ssh/ims-aws -r deploy/ ubuntu@<PROD_EC2_IP>:/home/ubuntu/deploy
```

## 3. Create `.env` on each instance

SSH into **dev**:

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<DEV_EC2_IP>
cd /home/ubuntu/deploy
cp .env.example .env
nano .env   # or vim: set POSTGRES_PASSWORD, JWT_SECRET, DATABASE_URL (host dev_db for dev)
```

For **dev**:

- `DATABASE_URL` must use hostname `dev_db`
- `REDIS_URL` should be `redis://dev_redis:6379`
- `STORAGE_ENDPOINT` should be `http://dev_minio:9000`

For **prod**:

- `DATABASE_URL` must use hostname `prod_db`
- `REDIS_URL` should be `redis://prod_redis:6379`
- `STORAGE_ENDPOINT` should be `http://prod_minio:9000`
- use strong passwords/secrets for all credentials.

## 4. Start the stack on Dev EC2

On the **dev** instance:

```bash
cd /home/ubuntu/deploy
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml -f watchtower.dev.yml up -d
```

Check:

```bash
docker ps
curl -s http://localhost:3000 | head
curl -s http://localhost:4000/health
curl -s http://localhost:9001 | head   # MinIO console
```

## 5. Start the stack on Prod EC2

On the **prod** instance:

```bash
cd /home/ubuntu/deploy
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml -f watchtower.prod.yml up -d
docker ps
```

## 6. Watchtower behavior

- **Dev**: Watchtower polls every 30s for new `rpandox/dev-api-ims:dev` and `rpandox/dev-web-ims:dev` images; when it finds an update, it pulls and restarts only `dev_web` and/or `dev_api`.
- **Prod**: Same for `:prod` and containers `prod_web` / `prod_api`.

So if only the frontend changes, CI pushes only the web image; Watchtower restarts only the web container on the matching environment.

## 7. Setup Nginx Reverse Proxy with HTTPS (Let's Encrypt)

### On PROD EC2:

1. **Install Nginx and Certbot:**

   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Copy Nginx config:**

   ```bash
   sudo cp /home/ubuntu/deploy/nginx-prod.conf /etc/nginx/sites-available/ims-prod.conf
   sudo ln -s /etc/nginx/sites-available/ims-prod.conf /etc/nginx/sites-enabled/ims-prod.conf
   ```

3. **Test and reload Nginx:**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Ensure DNS A records point to this EC2's public IP:**
   - `ims.shamankathmandu.com` → prod EC2 IP
   - `api.shamankathmandu.com` → prod EC2 IP

5. **Get HTTPS certificates:**

   ```bash
   sudo certbot --nginx -d ims.shamankathmandu.com -d api.shamankathmandu.com
   ```

   Certbot will automatically configure HTTPS and redirect HTTP → HTTPS.

### On DEV/STAGE EC2:

1. **Install Nginx and Certbot (same as above):**

   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Copy Nginx config:**

   ```bash
   sudo cp /home/ubuntu/deploy/nginx-stage.conf /etc/nginx/sites-available/ims-stage.conf
   sudo ln -s /etc/nginx/sites-available/ims-stage.conf /etc/nginx/sites-enabled/ims-stage.conf
   ```

3. **Test and reload Nginx:**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Ensure DNS A records point to this EC2's public IP:**
   - `stage-ims.shamankathmandu.com` → dev EC2 IP
   - `stage-api.shamankathmandu.com` → dev EC2 IP

5. **Get HTTPS certificates:**

   ```bash
   sudo certbot --nginx -d stage-ims.shamankathmandu.com -d stage-api.shamankathmandu.com
   ```

### Verify:

- **Prod**: Visit `https://ims.shamankathmandu.com` and `https://api.shamankathmandu.com`
- **Dev**: Visit `https://stage-ims.shamankathmandu.com` and `https://stage-api.shamankathmandu.com`

All should show valid HTTPS certificates (Let's Encrypt) and load your apps.

## 8. Production Database Seed

Run a minimal seed (platform admin + tenants only). The seed uses `SEED_MODE=production` to skip demo data.

**From your local machine** (recommended — requires DB access via tunnel or direct connection):

```bash
cd apps/api

# Set DATABASE_URL to prod (use SSH tunnel if DB isn't publicly reachable)
# ssh -L 5433:localhost:5432 ubuntu@<PROD_EC2_IP>
# DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5433/ims

SEED_MODE=production \
SEED_PLATFORM_ADMIN_PASSWORD=your-secure-password \
SEED_TENANTS=acme:Acme Corp,ruby:Ruby Store \
SEED_TENANT_PASSWORD=ChangeMe123! \
pnpm prisma:seed
```

**From prod EC2** (if the API image includes ts-node; otherwise use local):

```bash
cd /home/ubuntu/deploy
# Ensure .env has SEED_MODE=production, SEED_TENANTS, etc.

docker compose -f docker-compose.prod.yml run --rm prod_api pnpm prisma:seed
```

**Production seed creates:**

- System tenant + platform admin
- Minimal tenants from `SEED_TENANTS` (format: `slug:Name` or `slug:Name:password`)
- Default CRM pipeline

**Skips:** test1, test2, Ruby demo tenants with full products/sales data.

## 10. Production Database Backup

The prod stack includes an automatic backup container (`prod_backup`) that:

- **Runs daily at 2 AM** (server time)
- **Keeps 7 days** of backups, then deletes older ones
- **Stores** compressed backups (`.sql.gz`) in the `prod_backups` Docker volume

No manual steps are required. After starting the stack with `docker compose -f docker-compose.prod.yml up -d`, backups begin automatically.

### Backup location

Backups live inside the `prod_backups` volume. To list them from the prod EC2:

```bash
docker run --rm -v deploy_prod_backups:/backups alpine ls -la /backups/daily/
```

The volume name may be prefixed with the project directory (e.g. `deploy_prod_backups` if you run from `/home/ubuntu/deploy`). Use `docker volume ls` to see the exact name.

### Restore from a backup

**List available backups:**

```bash
docker exec prod_backup ls -la /backups/daily/
```

**Restore from latest backup** (from prod EC2; uses `ims-latest.sql.gz` symlink):

```bash
docker exec -i prod_backup /bin/sh -c "zcat /backups/daily/ims-latest.sql.gz | psql -h prod_db -U postgres -d ims"
```

Replace `postgres` and `ims` with your `POSTGRES_USER` and `POSTGRES_DB` if different. You will be prompted for the password (from your `.env`).

**Restore from a specific date** (e.g. `ims-20250220.sql.gz`):

```bash
docker exec -i prod_backup /bin/sh -c "zcat /backups/daily/ims-20250220.sql.gz | psql -h prod_db -U postgres -d ims"
```

## Troubleshooting

- **Containers exit**: Run `docker compose -f docker-compose.dev.yml logs` (or prod) and fix `.env` (e.g. wrong `DATABASE_URL`).
- **API can't connect to Redis/MinIO**: Verify `REDIS_URL` and `STORAGE_ENDPOINT` match compose service names (`dev_redis`/`dev_minio` or `prod_redis`/`prod_minio`).
- **Watchtower can’t pull**: Ensure `docker login` was run on that EC2 and the repo is public or the token has pull permission.
- **Network not found**: Start the app stack first (`docker-compose.dev.yml` or `docker-compose.prod.yml`), then start the watchtower compose so the `deploy_dev` / `deploy_prod` network exists.
- **Nginx 502 Bad Gateway**: Ensure Docker containers are running (`docker ps`) and listening on `localhost:3000` (web) and `localhost:4000` (api).
- **Certbot fails**: Ensure DNS A records are correct and pointing to the EC2 instance's public IP. Wait a few minutes after DNS changes.
- **301 redirect loop (e.g. behind Cloudflare)**: If the site is behind Cloudflare (or another proxy), the proxy sends HTTPS traffic to your server as HTTP. Nginx then redirects to HTTPS again, so the browser gets a 301 to the same URL and loops. Fix: use the updated `nginx-stage.conf` / `nginx-prod.conf` from this repo (they only redirect when `X-Forwarded-Proto` is not `https`). If certbot already modified your config, add at the top of the `http` block (in `/etc/nginx/nginx.conf` or in the same file): `map $http_x_forwarded_proto $forwarded_proto { default $http_x_forwarded_proto; '' $scheme; }` and in each **port 80** `server` block replace the line `return 301 https://...` with: `if ($forwarded_proto != "https") { return 301 https://$host$request_uri; }` and use `proxy_set_header X-Forwarded-Proto $forwarded_proto;` in `location /`. Then `sudo nginx -t && sudo systemctl reload nginx`.
