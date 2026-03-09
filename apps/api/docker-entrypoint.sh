#!/bin/sh
set -e

echo "Running database migrations..."
node /app/apps/api/node_modules/prisma/build/index.js migrate deploy --schema=/app/apps/api/prisma/schema.prisma

echo "Starting application..."
exec node apps/api/dist/index.js
