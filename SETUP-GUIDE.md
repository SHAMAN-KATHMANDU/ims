# CI/CD Setup Guide

This guide walks you through configuring the repository and Docker Hub so the pipeline can build and push Docker images. The pipeline does **not** deploy to servers; it only builds and pushes images to Docker Hub.

## Prerequisites

- GitHub repository with this codebase
- Docker Hub account
- (Optional) Node.js and pnpm for local lint/typecheck

## 1. GitHub configuration

### Enable Actions

- **Settings → Actions → General:** Ensure "Allow all actions and reusable workflows" (or allow the ones this repo uses).
- Workflows are under `.github/workflows/`.

### Create environment for production approval

1. **Settings → Environments → New environment**
2. Name: **prod-approval**
3. Under "Environment protection rules", add **Required reviewers** (e.g. yourself or a team).
4. Save. When a production build runs, it will wait for one of these reviewers to approve before building.

### Add repository secrets

**Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Name               | Value                    | Notes                                |
| ------------------ | ------------------------ | ------------------------------------ |
| DOCKERHUB_USERNAME | Your Docker Hub username | e.g. `myuser`                        |
| DOCKERHUB_TOKEN    | Docker Hub access token  | Create at hub.docker.com (see below) |

### Add repository variables

**Settings → Secrets and variables → Actions → Variables → New repository variable**

| Name    | Value                                                                  | Notes                                     |
| ------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| DEV_UI  | Content for dev web app .env (e.g. `NEXT_PUBLIC_API_URL=https://...`)  | Used when building web image from develop |
| PROD_UI | Content for prod web app .env (e.g. `NEXT_PUBLIC_API_URL=https://...`) | Used when building web image from main    |

These are written into `apps/web/.env` at build time so the Next.js app has the right API URL. Use one line or multiple `KEY=value` lines.

## 2. Docker Hub setup

### Create repositories

1. Log in to [Docker Hub](https://hub.docker.com).
2. Create two repositories (or use existing):
   - **dev-api-ims** (or match the image name used in workflows: `{username}/dev-api-ims`)
   - **dev-web-ims**
3. Visibility: public or private. If private, any host that pulls (e.g. your server) must `docker login` with a token that has read access.

### Create access token

1. **Account Settings → Security → New Access Token**
2. Description: e.g. "GitHub Actions build and push"
3. Permissions: **Read, Write, Delete** (write needed for push; delete for cleanup workflow)
4. Generate and copy the token. Store it in GitHub as **DOCKERHUB_TOKEN** (do not use your account password).

## 3. Initial build

1. Go to **Actions** in the repo.
2. Run **Build and Push (Dev)** or **Build and Push (Prod)** manually.
3. Choose branch (e.g. `main` or `develop`), set **force_deploy** to true to build both API and Web regardless of changes.
4. For prod, approve the **prod-approval** step when it appears (unless you used **skip_approval**).
5. Wait for the workflow to finish. Check **Docker Hub → Repositories** to see the new tags.

## 4. Verification

From a machine with Docker:

```bash
export DOCKERHUB_USERNAME=your_username

# Pull dev images
docker pull $DOCKERHUB_USERNAME/dev-api-ims:dev
docker pull $DOCKERHUB_USERNAME/dev-web-ims:dev

# Run API (set DATABASE_URL and other env as needed)
docker run --rm -p 4000:4000 -e DATABASE_URL=postgresql://... $DOCKERHUB_USERNAME/dev-api-ims:dev

# In another terminal, run Web (set NEXT_PUBLIC_API_URL)
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://host.docker.internal:4000/api/v1 $DOCKERHUB_USERNAME/dev-web-ims:dev
```

If both containers start and the web app can talk to the API, the images are valid.

## 5. Using the built images

- **Pull:** Use `docker pull` as above with the tag you need (`dev`, `prod`, `latest`, or `dev-<sha>` / `prod-<sha>`).
- **Run:** Pass required environment variables (e.g. `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, `JWT_SECRET`) via `-e` or an env file.
- **Compose:** See **QUICK-REFERENCE.md** for a minimal docker-compose example that uses these images.

Deployment to your actual servers (e.g. EC2, Kubernetes) is **not** part of this pipeline. Use your existing process (e.g. copy `deploy/` to the server, run docker-compose there, or use Watchtower to pull and restart). See **deploy/README.md** if your project uses that folder.

## 6. Next steps

- Configure **prod-approval** reviewers and branch rules so only intended people can approve prod builds.
- Add a `test` script to `apps/api` and `apps/web` in `package.json` so CI runs real tests (see **CI-CD-DOCUMENTATION.md**).
- Optionally adjust Trivy severity or ignores in `.github/workflows/ci.yml` if you need to relax or tighten security checks.
- For server deployment, follow **deploy/README.md** or your own runbooks.
