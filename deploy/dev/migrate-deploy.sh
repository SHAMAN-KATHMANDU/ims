#!/usr/bin/env bash
# Run prisma migrate deploy using the same Docker image as dev_api (matches migration checksums on disk).
# Use for: verifying pending migrations before Watchtower restarts, or after manual DB recovery.
# Requires: postgres healthy, ./.env with DATABASE_URL pointing at dev_db.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${ROOT}/functions.sh"

require_docker
require_env "$ROOT"
cd "$ROOT"

set -a
# shellcheck source=/dev/null
source .env
set +a

step "Prisma migrate deploy (dev_api image)"
docker compose run --rm --no-deps \
  --entrypoint "" \
  -e DATABASE_URL="${DATABASE_URL}" \
  dev_api \
  node /app/apps/api/node_modules/prisma/build/index.js migrate deploy \
  --schema=/app/apps/api/prisma/schema.prisma

success "migrate deploy finished"
