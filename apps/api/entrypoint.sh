#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  sleep 1
done

echo "✅ PostgreSQL is up"

echo "🧬 Running Prisma generate..."
pnpm --filter api prisma:generate

echo "📦 Running Prisma migrations..."
pnpm --filter api prisma:migrate

echo "Seeding database..."
pnpm --filter api prisma:seed

echo "🚀 Starting API..."
exec "$@"
