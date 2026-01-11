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

### GitHub Actions

The project includes a CI/CD pipeline that automatically builds and pushes Docker images to Docker Hub.

**Setup:**

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

2. Add these secrets:

   | Secret               | Description              |
   | -------------------- | ------------------------ |
   | `DOCKERHUB_USERNAME` | Your Docker Hub username |
   | `DOCKERHUB_TOKEN`    | Docker Hub access token  |

3. Push to `main` branch to trigger the build

**What it does:**

- Builds `api` and `web` Docker images
- Pushes to Docker Hub with tags: `latest`, branch name, commit SHA
- Watchtower on your server auto-pulls new images

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Commit (hooks will run automatically)
4. Push and create a PR

## License

MIT
