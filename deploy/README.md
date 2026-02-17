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
scp -i ~/.ssh/ims-aws -r deploy/ ubuntu@<DEV_EC2_IP>:/home/ubuntu/deploy

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

For **dev**, `DATABASE_URL` must use hostname `dev_db` and the same password as `POSTGRES_PASSWORD`.  
For **prod**, use hostname `prod_db` and strong passwords.

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

## Troubleshooting

- **Containers exit**: Run `docker compose -f docker-compose.dev.yml logs` (or prod) and fix `.env` (e.g. wrong `DATABASE_URL`).
- **Watchtower can’t pull**: Ensure `docker login` was run on that EC2 and the repo is public or the token has pull permission.
- **Network not found**: Start the app stack first (`docker-compose.dev.yml` or `docker-compose.prod.yml`), then start the watchtower compose so the `deploy_dev` / `deploy_prod` network exists.
- **Nginx 502 Bad Gateway**: Ensure Docker containers are running (`docker ps`) and listening on `localhost:3000` (web) and `localhost:4000` (api).
- **Certbot fails**: Ensure DNS A records are correct and pointing to the EC2 instance's public IP. Wait a few minutes after DNS changes.
- **301 redirect loop (e.g. behind Cloudflare)**: If the site is behind Cloudflare (or another proxy), the proxy sends HTTPS traffic to your server as HTTP. Nginx then redirects to HTTPS again, so the browser gets a 301 to the same URL and loops. Fix: use the updated `nginx-stage.conf` / `nginx-prod.conf` from this repo (they only redirect when `X-Forwarded-Proto` is not `https`). If certbot already modified your config, add at the top of the `http` block (in `/etc/nginx/nginx.conf` or in the same file): `map $http_x_forwarded_proto $forwarded_proto { default $http_x_forwarded_proto; '' $scheme; }` and in each **port 80** `server` block replace the line `return 301 https://...` with: `if ($forwarded_proto != "https") { return 301 https://$host$request_uri; }` and use `proxy_set_header X-Forwarded-Proto $forwarded_proto;` in `location /`. Then `sudo nginx -t && sudo systemctl reload nginx`.
