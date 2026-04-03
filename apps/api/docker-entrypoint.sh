#!/bin/sh
set -e

PRISMA_CLI="node /app/apps/api/node_modules/prisma/build/index.js"
PRISMA_SCHEMA="--schema=/app/apps/api/prisma/schema.prisma"

# Brief wait for Postgres TCP (avoids rare races right after compose marks db healthy).
echo "Waiting for database (TCP)..."
i=0
db_ready=0
while [ "$i" -lt 45 ]; do
  if node -e "
    const u = process.env.DATABASE_URL;
    if (!u) process.exit(1);
    const { hostname, port } = new URL(u);
    const p = port ? Number(port) : 5432;
    const net = require('net');
    const c = net.createConnection({ host: hostname, port: p }, () => { c.end(); process.exit(0); });
    c.on('error', () => process.exit(1));
  " 2>/dev/null; then
    db_ready=1
    break
  fi
  i=$((i + 1))
  sleep 1
done

if [ "$db_ready" -ne 1 ]; then
  echo ""
  echo "ERROR: DATABASE_URL is unreachable after 45s."
  echo "Check prod_db/dev_db is healthy and DATABASE_URL uses the Compose service name as host."
  exit 1
fi

echo "Running database migrations..."
if ! $PRISMA_CLI migrate deploy $PRISMA_SCHEMA; then
  echo ""
  echo "=========================================="
  echo "ERROR: prisma migrate deploy failed."
  echo "=========================================="
  echo "P3009 (failed migration): clear the failed row with prisma migrate resolve, then fix drift."
  echo "  https://pris.ly/d/migrate-resolve"
  echo "Runbook: deploy/README.md → \"Failed Prisma migrations (P3009)\"."
  echo "Use the same API image / git SHA for migrations and application code (checksums in _prisma_migrations)."
  echo "=========================================="
  exit 1
fi

echo "Starting application..."
exec node apps/api/dist/index.js
