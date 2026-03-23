#!/usr/bin/env bash
# =============================================================================
# deploy/prod/seed.sh
# Run the Prisma database seed for the PRODUCTION environment.
# Uses SEED_MODE=production (reads from .env) to skip demo data.
# Creates: platform admin + tenants from SEED_TENANTS.
#
# Usage:
#   ./seed.sh   -- run production seed (safe to run once on fresh DB)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker
require_env "."

step "Database Seed (Production)"
divider

warn "This will seed the production database."
warn "It is safe to run on a fresh database (creates platform admin + tenants)."
warn "Running on an already-seeded database may create duplicate entries."
echo ""
confirm_action "Proceed with production seed?"

# -----------------------------------------------------------------------------
# Check API container is running
# -----------------------------------------------------------------------------
if ! docker compose ps prod_api 2>/dev/null | grep -qE "Up|running"; then
  error "prod_api container is not running. Start the stack first with ./up.sh"
  exit 1
fi

# Load env vars
set -a
# shellcheck source=/dev/null
source .env
set +a

# -----------------------------------------------------------------------------
# Run seed
# -----------------------------------------------------------------------------
step "Running prisma:seed (SEED_MODE=production)..."

docker compose exec \
  -e SEED_MODE="${SEED_MODE:-production}" \
  -e SEED_PLATFORM_ADMIN_USERNAME="${SEED_PLATFORM_ADMIN_USERNAME:-platform}" \
  -e SEED_PLATFORM_ADMIN_PASSWORD="${SEED_PLATFORM_ADMIN_PASSWORD:-}" \
  -e SEED_TENANTS="${SEED_TENANTS:-}" \
  -e SEED_TENANT_PASSWORD="${SEED_TENANT_PASSWORD:-}" \
  prod_api \
  sh -c "cd /app && node apps/api/node_modules/prisma/build/index.js db seed --schema=apps/api/prisma/schema.prisma"

divider
success "Production seed complete!"
echo ""
echo "Created:"
echo "  Platform admin: ${SEED_PLATFORM_ADMIN_USERNAME:-platform}"
if [[ -n "${SEED_TENANTS:-}" ]]; then
  echo "  Tenants: ${SEED_TENANTS}"
fi
echo ""
