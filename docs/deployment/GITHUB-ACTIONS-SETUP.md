# GitHub Actions CI/CD Setup

## Required GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **Secrets**:

1. **`DOCKERHUB_USERNAME`**
   - Your Docker Hub username (e.g. `rpandox`)

2. **`DOCKERHUB_TOKEN`**
   - Docker Hub access token (not password)
   - Create at: https://hub.docker.com/settings/security → **New Access Token**
   - Give it read/write permissions

## Required GitHub Variables

Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**:

1. **`DEV_UI`**
   - Value: `https://stage-api.shamankathmandu.com/api/v1`
   - Used when building web image from `develop` or `devlop` branch

2. **`PROD_UI`**
   - Value: `https://api.shamankathmandu.com/api/v1`
   - Used when building web image from `main` or `master` branch

## How It Works

- **Push to `develop` or `devlop`**:
  - Builds and pushes `rpandox/dev-api-ims:dev` and `rpandox/dev-web-ims:dev`
  - Only builds what changed (web or api based on file paths)
  - Dev EC2's Watchtower pulls new `:dev` images and restarts containers

- **Push to `main` or `master`**:
  - Builds and pushes `rpandox/dev-api-ims:prod`, `rpandox/dev-api-ims:prod-<sha>`, `rpandox/dev-api-ims:latest`
  - Same for web images
  - Only builds what changed (web or api based on file paths)
  - Prod EC2's Watchtower pulls new `:prod` images and restarts containers

## Testing the Flow

1. Make a small change in `apps/web/**` (e.g. update a text string)
2. Commit and push to `develop` branch
3. Check GitHub Actions → workflow should run `build-and-push-dev` job
4. Only the web build step should run (API build should be skipped)
5. After ~30 seconds, check dev EC2: `docker ps` → `dev_web` container should have a new image
6. Visit `https://stage-ims.shamankathmandu.com` → your change should be visible
