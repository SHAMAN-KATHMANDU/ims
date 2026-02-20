#!/bin/sh
# Runs Prisma migrations before starting the API.
# Enables automatic migrations when Watchtower restarts the container with a new image.
set -e
cd /app/apps/api && npx prisma migrate deploy
exec node /app/apps/api/dist/index.js
