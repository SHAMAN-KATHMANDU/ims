# IMS (Inventory Management System)

A modern, full-stack inventory management system built with a Turborepo monorepo architecture.

## Tech Stack

- **Framework**: Turborepo monorepo
- **API**: Node.js/Express (runs on port 4000)
- **Web**: Next.js (runs on port 3000)
- **Database**: PostgreSQL 16 (runs on port 5432)
- **ORM**: Prisma
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)
- [Docker](https://www.docker.com/) and Docker Compose

## Project Structure

```
.
├── apps/
│   ├── api/          # Backend API (Port 4000)
│   └── web/          # Frontend application (Port 3000)
├── packages/         # Shared packages
├── docker-compose.yml
├── .env
└── README.md
```

## Getting Started

Follow these steps to set up the project on a new machine:

### 1. Install Dependencies

```bash
pnpm i
```

This installs all dependencies for the monorepo and its workspace packages.

### 2. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This command:
- Starts a PostgreSQL 16 container
- Creates the database with credentials defined in `.env`
- Exposes PostgreSQL on port 5432 (default)
- Sets up the superadmin username and password from environment variables

### 3. Generate Prisma Client

```bash
pnpm prisma:generate
```

**What this does:**
- Reads your `prisma/schema.prisma` file
- Generates a type-safe Prisma Client based on your database schema
- Creates TypeScript types for your models
- Must be run whenever you modify your Prisma schema

### 4. Run Database Migrations

**For Development:**
```bash
pnpm prisma:migrate
```

**For Production/Deployment:**
```bash
pnpm prisma:migrate:deploy
```

**What this does:**
- **Development mode** (`prisma:migrate`): 
  - Creates new migration files based on schema changes
  - Applies migrations to your database
  - Updates your database schema (creates/modifies tables, columns, etc.)
  - Ideal for active development with schema changes

- **Production mode** (`prisma:migrate:deploy`):
  - Only applies existing migrations
  - Does not create new migration files
  - Safer for production environments
  - Used in CI/CD pipelines and production deployments

### 5. Seed the Database

```bash
pnpm prisma:seed
```

**What this does:**
- Creates a superuser account with credentials defined in your `.env` file
- Populates initial data required for the application
- Uses `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` from `.env`

### 6. Start Development Servers

```bash
pnpm dev
```

This starts all applications in development mode:
- **API**: http://localhost:4000
- **Web**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# PostgreSQL Configuration
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database_name
POSTGRES_PORT=5432

# Database Connection URL
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/your_database_name?schema=public

# Superadmin Credentials (for seeding)
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=secure_password_here

# API Configuration
PORT=4000
JWT_SECRET=your_jwt_secret_key

# Web/Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Port Configuration

| Service    | Port | Description                |
|------------|------|----------------------------|
| PostgreSQL | 5432 | Database server            |
| API        | 4000 | Backend REST API           |
| Web        | 3000 | Frontend Next.js app       |

## Common Commands

```bash
# Install dependencies
pnpm i

# Start all apps in development
pnpm dev

# Build all apps for production
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format

# Clean all build outputs and node_modules
pnpm clean
```

## Database Commands

```bash
# Generate Prisma Client
pnpm prisma:generate

# Create and apply migrations (development)
pnpm prisma:migrate

# Apply existing migrations (production)
pnpm prisma:migrate:deploy

# Seed the database
pnpm prisma:seed

# Open Prisma Studio (database GUI)
pnpm prisma:studio

# Reset database (WARNING: deletes all data)
pnpm prisma:reset
```

## Docker Commands

```bash
# Start PostgreSQL container
docker-compose up -d

# Stop PostgreSQL container
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Access PostgreSQL CLI
docker exec -it projectx-postgres psql -U your_username -d your_database_name
```

## Testing on a Fresh Environment

To simulate a completely fresh setup:

```bash
# Clean everything
docker-compose down -v
rm -rf node_modules
rm pnpm-lock.yaml

# Start from scratch
pnpm i
docker-compose up -d
sleep 5  # Wait for PostgreSQL to initialize
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker ps`
- Check if PostgreSQL is healthy: `docker-compose ps`
- Verify `.env` credentials match `docker-compose.yml`

### Prisma Client Errors
- Regenerate the client: `pnpm prisma:generate`
- Check that migrations are applied: `pnpm prisma:migrate`

### Port Conflicts
- Check if ports are already in use: `lsof -i :3000,4000,5432`
- Modify ports in `.env` if needed

## Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Commit your changes: `git commit -m 'Add some feature'`
5. Push to the branch: `git push origin feature/your-feature`
6. Open a Pull Request

