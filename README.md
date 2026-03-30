# IMS - Inventory Management System

A full-stack inventory management system built with Next.js, Express, Prisma, and PostgreSQL in a Turborepo monorepo.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Docker Setup](#docker-setup)
- [CI/CD](#cicd)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker** & **Docker Compose** (for containerized development)
- **PostgreSQL** (if running locally without Docker)

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ims

# 2. Install dependencies (this also sets up Husky git hooks)
pnpm install

# 3. Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start development with Docker
docker-compose -f docker-compose.dev.yml up --build

# Or start without Docker (requires local PostgreSQL)
pnpm dev
```

## Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

This command will:

- Install all workspace dependencies
- **Automatically set up Husky git hooks** (via the `prepare` script)

### 2. Git Hooks (Husky)

Husky is configured to run pre-commit checks automatically. After `pnpm install`, the hooks are ready.

**What happens on commit:**

- 📝 **Commitlint** validates commit message (conventional commits)
- ✨ **Prettier** formats staged files
- 🔎 **ESLint** checks for code issues
- 📝 **TypeScript** validates types across all packages

**If you need to reinstall Husky manually:**

```bash
# This runs automatically on `pnpm install`, but if needed:
pnpm prepare
```

**To skip hooks temporarily (not recommended):**

```bash
git commit --no-verify -m "your message"
```

### 3. Environment Variables

Create `.env` files from examples:

```bash
# Root level (for Docker)
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env

# Web (if needed)
cp apps/web/.env.example apps/web/.env
```

**Required environment variables:**

| Variable              | Description                  | Example                                             |
| --------------------- | ---------------------------- | --------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ims` |
| `JWT_SECRET`          | Secret for JWT tokens        | `your-secret-key`                                   |
| `NEXT_PUBLIC_API_URL` | API URL for frontend         | `http://localhost:4000`                             |

### 4. Database Setup

```bash
# Generate Prisma client
pnpm --filter api prisma generate

# Run migrations
pnpm --filter api prisma migrate dev

# Seed the database (optional)
pnpm --filter api prisma:seed
```

## Docker Setup

### Development (with hot reload)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Services:

- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **PostgreSQL**: localhost:5432

### Production (local build)

```bash
docker-compose up --build
```

### Production (from Docker Hub)

```bash
# Copy and configure environment
cp .env.prod.example .env

# Start services (includes Watchtower for auto-updates)
docker-compose -f docker-compose.prod.yml up -d
```

## CI/CD

### Branching & Releases

- **main** — single permanent branch. All work branches from `main`.
- **Staging** — auto-deploys when PRs are squash-merged into `main`.
- **Production** — manual release via [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github). Tags (e.g. `v1.0.0`) control prod.

See [.github/WORKFLOW_GUIDE.md](.github/WORKFLOW_GUIDE.md), [.github/COMMIT_CONVENTION.md](.github/COMMIT_CONVENTION.md), [.github/RELEASE_PROCESS.md](.github/RELEASE_PROCESS.md) for details. For server deployment (EC2, Watchtower, rollback), see [docs/SERVER-DEPLOYMENT.md](docs/SERVER-DEPLOYMENT.md).

### GitHub Actions

**Setup:** Add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` secrets and `PROD_UI`, `DEV_UI` variables in repo Settings → Actions.

**Workflows:**

- **CI** — lint, typecheck, tests, PR title validation on every push/PR
- **Build and Push (Staging)** — on merge to `main` → pushes `:dev` images
- **Release (Production)** — on publish of a release → pushes `:<tag>`, `:prod`, `:latest`

## Project Structure

```
ims/
├── apps/
│   ├── api/                 # Express.js API server
│   │   ├── prisma/          # Database schema & migrations
│   │   └── src/             # API source code
│   └── web/                 # Next.js frontend
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── hooks/           # Custom hooks
├── packages/
│   ├── eslint-config/       # Shared ESLint configs
│   ├── typescript-config/   # Shared TypeScript configs
│   └── ui/                  # Shared UI components
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Production Docker (local build)
├── docker-compose.dev.yml   # Development Docker
└── docker-compose.prod.yml  # Production Docker (from Docker Hub)
```

## Available Scripts

Run from the root directory:

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm install`     | Install dependencies & setup Husky |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all apps for production      |
| `pnpm lint`        | Run ESLint across all packages     |
| `pnpm check-types` | Run TypeScript type checking       |
| `pnpm format`      | Format code with Prettier          |

### API-specific commands

```bash
# Database
pnpm --filter api prisma generate    # Generate Prisma client
pnpm --filter api prisma migrate dev # Run migrations
pnpm --filter api prisma studio      # Open Prisma Studio
pnpm --filter api prisma:seed        # Seed database
```

## Troubleshooting

### Husky hooks not running

```bash
# Reinstall Husky
pnpm prepare

# Check if .husky folder exists
ls -la .husky/
```

### Docker build fails with lightningcss error

The Dockerfiles are configured to handle this automatically. If you still encounter issues:

```bash
# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache
```

### TypeScript errors on commit

The pre-commit hook runs type checking. Fix errors before committing:

```bash
# Check what's failing
pnpm check-types

# Fix and try again
git add .
git commit -m "your message"
```

### pnpm lockfile parse error in CI

If CI fails with `ERR_PNPM_BROKEN_LOCKFILE` (for example, "duplicated mapping key"),
regenerate the lockfile locally and verify it before pushing:

```bash
pnpm install --lockfile-only
pnpm install --frozen-lockfile
```

## Contributing

1. Branch from `main` (e.g. `#42-feat/my-feature`)
2. Make your changes
3. Commit with [conventional commits](.github/COMMIT_CONVENTION.md) (hooks enforce format)
4. Push and create a PR with a conventional title
5. Squash merge to `main` after approval

## License

MIT
