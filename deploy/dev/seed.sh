#!/usr/bin/env bash
# =============================================================================
# deploy/dev/seed.sh
# Run the Prisma database seed for the dev/stage environment.
# Reads SEED_* vars from .env (loaded by docker compose env_file).
#
# Usage:
#   ./seed.sh          -- run with SEED_MODE from .env
#   ./seed.sh --reset  -- drop + re-create all data (WARNING: destructive)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker
require_env "."

RESET_MODE=false
if [[ "${1:-}" == "--reset" ]]; then
  RESET_MODE=true
fi

step "Database Seed (Dev/Stage)"
divider

# -----------------------------------------------------------------------------
# Check API container is running
# -----------------------------------------------------------------------------
if ! docker compose ps dev_api | grep -q "Up\|running"; then
  error "dev_api container is not running. Start the stack first with ./up.sh"
  exit 1
fi

if $RESET_MODE; then
  warn "Reset mode: this will DROP all data and re-seed from scratch."
  confirm_action "Destroy all dev data and re-seed?"
  step "Resetting database..."
  docker compose exec dev_api sh -c "node /app/apps/api/node_modules/prisma/build/index.js migrate reset --force --schema=/app/apps/api/prisma/schema.prisma"
  success "Database reset"
fi

# -----------------------------------------------------------------------------
# Run seed
# -----------------------------------------------------------------------------
step "Running prisma:seed..."
# Pass seed vars from .env into the container via -e flags
set -a
# shellcheck source=/dev/null
source .env
set +a

docker compose exec \
  -e SEED_MODE="${SEED_MODE:-production}" \
  -e SEED_PLATFORM_ADMIN_USERNAME="${SEED_PLATFORM_ADMIN_USERNAME:-platform}" \
  -e SEED_PLATFORM_ADMIN_PASSWORD="${SEED_PLATFORM_ADMIN_PASSWORD:-}" \
  -e SEED_TENANTS="${SEED_TENANTS:-}" \
  -e SEED_TENANT_PASSWORD="${SEED_TENANT_PASSWORD:-ChangeMe123!}" \
  dev_api \
  sh -c "cd /app && node apps/api/node_modules/prisma/build/index.js db seed --schema=apps/api/prisma/schema.prisma"

divider
success "Seed complete!"
echo ""
