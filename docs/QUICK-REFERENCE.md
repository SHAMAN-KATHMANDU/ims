# CI/CD Quick Reference

## Manual build (GitHub Actions UI)

1. **Actions** → choose workflow:
   - **Build and Push (Dev)** for dev images
   - **Build and Push (Prod)** for prod images
2. **Run workflow** → select branch.
3. Options:
   - **deploy_api** / **deploy_web:** which images to build (both default true).
   - **force_deploy:** build both even if no changes.
   - **skip_approval** (prod only): skip manual approval.
4. Click **Run workflow**. For prod, approve when **prod-approval** is pending.

---

## Docker pull commands

Replace `USER` with your Docker Hub username.

| Image            | Tag examples                                       |
| ---------------- | -------------------------------------------------- |
| USER/dev-api-ims | `dev`, `prod`, `latest`, `dev-<sha>`, `prod-<sha>` |
| USER/dev-web-ims | `dev`, `prod`, `latest`, `dev-<sha>`, `prod-<sha>` |

```bash
export USER=your_dockerhub_username

# Dev
docker pull $USER/dev-api-ims:dev
docker pull $USER/dev-web-ims:dev

# Prod / latest
docker pull $USER/dev-api-ims:prod
docker pull $USER/dev-api-ims:latest
docker pull $USER/dev-web-ims:prod
docker pull $USER/dev-web-ims:latest

# Specific commit
docker pull $USER/dev-api-ims:prod-abc1234
docker pull $USER/dev-web-ims:dev-abc1234
```

---

## Docker run (one-line examples)

```bash
# API (set DATABASE_URL and other env as needed)
docker run -d -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  $USER/dev-api-ims:prod

# Web (set API URL for the frontend)
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1" \
  $USER/dev-web-ims:prod
```

---

## docker-compose example (local use)

```yaml
# Example: run built images locally (no server deployment)
services:
  api:
    image: YOUR_DOCKERHUB_USERNAME/dev-api-ims:prod
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
      - JWT_SECRET=your-jwt-secret

  web:
    image: YOUR_DOCKERHUB_USERNAME/dev-web-ims:prod
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:4000/api/v1
    depends_on:
      - api
```

Run: `docker compose up -d` (after replacing `YOUR_DOCKERHUB_USERNAME` and env values).

---

## Git workflow

| Action                     | What runs                                                     |
| -------------------------- | ------------------------------------------------------------- |
| Push / open PR             | CI (lint, test, typecheck, Trivy)                             |
| Push to develop/devlop     | CI + Build and Push (Dev) if api/web/packages changed         |
| Push to main/master        | CI + Build and Push (Prod) if changed → then approval → build |
| Merge PR to develop/devlop | Build and Push (Dev) for merge commit                         |
| Merge PR to main/master    | Build and Push (Prod) for merge commit                        |

---

## Build status

- **Actions** tab → select workflow run → open the run to see jobs and logs.
- **Reusable Docker Build** logs show build and push; **changes** job shows which paths were detected.

---

## Image tags reference

| Tag pattern  | When produced              |
| ------------ | -------------------------- |
| `dev`        | Build and Push (Dev)       |
| `dev-<sha>`  | Build and Push (Dev)       |
| `prod`       | Build and Push (Prod)      |
| `prod-<sha>` | Build and Push (Prod)      |
| `latest`     | Build and Push (Prod) only |

---

## Troubleshooting

- **Credentials:** Check **DOCKERHUB_USERNAME** and **DOCKERHUB_TOKEN** in repo secrets. Token must have read/write.
- **Approval:** Prod build uses environment **prod-approval**. Add it under **Settings → Environments** with required reviewers.
- **Change detection:** Only changes under `apps/api/**`, `apps/web/**`, `packages/**` trigger API/Web builds. Use **force_deploy** to build anyway.
- **Cache:** Build uses GHA cache. If builds are wrong or stale, run **Cleanup** (with dry_run false) or change cache key in the reusable workflow.

---

## Environment variables (for running containers)

Set these when you **run** the containers (not stored in the pipeline):

- **API:** `DATABASE_URL`, `JWT_SECRET`, and any other vars your API needs (see app docs).
- **Web:** `NEXT_PUBLIC_API_URL` (and any other public env your Next.js app expects).

---

## Cleanup

- **When:** Weekly (Sunday 02:00 UTC) or manual.
- **Manual:** **Actions → Cleanup → Run workflow.** Inputs:
  - **days_to_keep:** delete image tags older than this (default 30).
  - **dry_run:** true = only list; false = actually delete. Schedule runs perform deletes.
- **Protected tags:** `latest`, `prod`, `dev` are never deleted. Old `prod-<sha>` and `dev-<sha>` tags are removed when older than `days_to_keep`.
