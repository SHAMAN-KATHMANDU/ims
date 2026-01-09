#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  sleep 1
done

echo "✅ PostgreSQL is up"

echo "🧬 Running Prisma reset..."
pnpm --filter api prisma:reset

echo "🧬 Running Prisma generate..."
pnpm --filter api prisma:generate

echo "📦 Running Prisma migrations..."
# Check if running in Docker (non-interactive)
if [ -t 0 ]; then
  # Interactive mode - use migrate dev
  pnpm --filter api prisma:migrate
else
  # Non-interactive mode (Docker) - use migrate deploy
  pnpm --filter api prisma:migrate:deploy
fi

echo "Seeding database..."
pnpm --filter api prisma:seed

echo "🚀 Starting API..."
exec "$@"