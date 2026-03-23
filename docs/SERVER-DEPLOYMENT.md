# Server Deployment Guide — Tag-Based CI/CD

This guide explains what to do on your **staging** and **production** EC2 servers for the new tag-based CI/CD flow. For AWS/EC2 setup, see [AWS-SETUP.md](AWS-SETUP.md).

---

## Overview

| Server     | Docker images       | Watchtower watches     | Triggered by             |
| ---------- | ------------------- | ---------------------- | ------------------------ |
| Staging    | `:dev` (api + web)  | `dev_web`, `dev_api`   | Squash merge to `main`   |
| Production | `:prod` (api + web) | `prod_web`, `prod_api` | Publish a GitHub Release |

- **Staging**: Auto-deploys when you merge a PR to `main`. No action on the server.
- **Production**: Auto-deploys when you publish a release (e.g. `v1.2.0`) from GitHub. No action on the server.
- **Rollback**: Publish a release for an existing tag from GitHub. Watchtower pulls the re-built `:prod` and restarts.

---

## Prerequisites

- Two EC2 instances (or one, if you run staging and prod on the same machine with different ports).
- Docker and Docker Compose installed.
- SSH access (see [AWS-SETUP.md](AWS-SETUP.md) for SSH key setup).
- GitHub Actions configured with `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DEV_UI`, `PROD_UI`.

---

## 1. One-Time Setup: Staging Server (Dev EC2)

### 1.1 SSH and Docker Login

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<STAGING_EC2_IP>
docker login
# Enter your Docker Hub username and token/password.
```

### 1.2 Copy Deploy Files

From your **local machine**:

```bash
scp -i ~/.ssh/ims-aws -r deploy/ ubuntu@<STAGING_EC2_IP>:/home/ubuntu/deploy
```

### 1.3 Create `.env`

On the **staging** EC2:

```bash
cd /home/ubuntu/deploy
cp .env.example .env
nano .env
```

Set:

- `POSTGRES_PASSWORD` — strong password for PostgreSQL
- `DATABASE_URL=postgresql://postgres:<PASSWORD>@dev_db:5432/ims`
- `JWT_SECRET` — secret key for JWT

### 1.4 Start Staging Stack

```bash
cd /home/ubuntu/deploy
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml -f watchtower.dev.yml up -d
```

### 1.5 Verify

```bash
docker ps
curl -s http://localhost:3000 | head
curl -s http://localhost:4000/health
```

---

## 2. One-Time Setup: Production Server (Prod EC2)

### 2.1 SSH and Docker Login

```bash
ssh -i ~/.ssh/ims-aws ubuntu@<PROD_EC2_IP>
docker login
```

### 2.2 Copy Deploy Files

```bash
scp -i ~/.ssh/ims-aws -r deploy/ ubuntu@<PROD_EC2_IP>:/home/ubuntu/deploy
```

### 2.3 Create `.env`

On the **prod** EC2:

```bash
cd /home/ubuntu/deploy
cp .env.example .env
nano .env
```

Set:

- `POSTGRES_PASSWORD` — strong, unique password
- `DATABASE_URL=postgresql://postgres:<PASSWORD>@prod_db:5432/ims`
- `JWT_SECRET` — strong secret (different from staging)

### 2.4 Start Production Stack

```bash
cd /home/ubuntu/deploy
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml -f watchtower.prod.yml up -d
```

### 2.5 Verify

```bash
docker ps
curl -s http://localhost:3000 | head
curl -s http://localhost:4000/health
```

---

## 3. What Happens Automatically

### Staging

1. You squash merge a PR to `main`.
2. GitHub Actions builds `rpandox/dev-api-ims:dev` and `rpandox/dev-web-ims:dev`.
3. Watchtower on staging EC2 polls Docker Hub every 30s.
4. It detects new `:dev` images, pulls them, and restarts `dev_web` and `dev_api`.
5. No SSH or manual deploy needed.

### Production

1. You go to **Releases** → **Draft a new release** → Target `main` → Tag `v1.2.0` → **Publish**.
2. GitHub Actions builds images tagged `:v1.2.0`, `:prod`, and `:latest`.
3. Watchtower on prod EC2 polls for new `:prod` images.
4. It pulls and restarts `prod_web` and `prod_api`.
5. No SSH or manual deploy needed.

---

## 4. Rollback (Production)

To roll back to a previous version:

1. Go to **GitHub** → **Releases** → **Draft a new release**.
2. **Tag:** Choose existing tag (e.g. `v1.1.0`).
3. **Publish release**.
4. The release workflow rebuilds images and pushes `:prod` and `:latest`.
5. Watchtower on prod detects the updated `:prod` and restarts containers with the older code.

No server access needed.

---

## 5. Manual Deploy of a Specific Tag (Advanced)

If you need to deploy a specific version without going through GitHub Releases (e.g. quick test):

### On prod EC2:

```bash
cd /home/ubuntu/deploy

# Pull specific version
docker compose -f docker-compose.prod.yml pull rpandox/dev-api-ims:v1.0.0 rpandox/dev-web-ims:v1.0.0
```

Then edit `docker-compose.prod.yml` to use `:v1.0.0` instead of `:prod` for the image tags, and:

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Note:** This breaks Watchtower’s automatic updates because it expects `:prod`. Revert the compose file and redeploy `:prod` when done, or use the GitHub Releases rollback flow instead.

---

## 6. Nginx + HTTPS (Optional)

See [deploy/README.md](../deploy/README.md) for **Nginx**, **Let’s Encrypt** (`setup-nginx.sh`), and the full **script reference**.

---

## 7. Offsite backups (S3, optional)

After the stack is running and `/home/ubuntu/backups` exists:

1. Attach an EC2 **IAM instance profile** that can write to your backup bucket (see infra / Terraform).
2. On the server: `cd /home/ubuntu/deploy && ./setup-backups.sh`
3. Optional test: `./backup-s3.sh`

Full details: [deploy/README.md — Offsite backups (S3)](../deploy/README.md#offsite-backups-s3).

---

## 8. Checklist: First Deploy

| Step                          | Staging | Production |
| ----------------------------- | ------- | ---------- |
| SSH + `docker login`          | [ ]     | [ ]        |
| Copy `deploy/` folder         | [ ]     | [ ]        |
| Create `.env`                 | [ ]     | [ ]        |
| Start app stack               | [ ]     | [ ]        |
| Start Watchtower              | [ ]     | [ ]        |
| Verify `docker ps`            | [ ]     | [ ]        |
| Nginx + HTTPS (optional)      | [ ]     | [ ]        |
| S3 offsite backups (optional) | [ ]     | [ ]        |

---

## 9. Troubleshooting

| Issue                  | Check                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Watchtower not pulling | `docker login` on EC2; repo public or token has pull permission                    |
| Containers crash       | `docker compose -f docker-compose.prod.yml logs`; fix `.env` (e.g. `DATABASE_URL`) |
| Network not found      | Start app stack first, then Watchtower compose                                     |
| Staging not updating   | Ensure `main` has new merges and Build and Push (Staging) workflow ran             |
| Prod not updating      | Ensure a release was published; Release workflow ran                               |
| Rollback not working   | Publish a **new** release that **chooses existing tag** (e.g. `v1.1.0`)            |
