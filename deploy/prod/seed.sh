#!/usr/bin/env bash
# =============================================================================
# deploy/prod/seed.sh
# Orchestrated Prisma seed for production (EC2). Run from this folder.
#
# Always seeds: plan limits + platform admin (credentials from .env).
# Optional blocks: chosen interactively after you confirm (type "yes").
#
# WARNING: Re-running on a populated DB may skip existing slugs or cause
# duplicates depending on seed idempotency. Prefer a fresh DB for full samples.
#
# Usage:
#   ./seed.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker
require_env "."

prompt_include() {
  local prompt_text="$1"
  echo -e "${COLOR_YELLOW}${prompt_text}${COLOR_RESET}"
  read -r -p "Type 'yes' to include, anything else to skip: " answer
  [[ "$answer" == "yes" ]]
}

step "Database Seed (Production)"
divider

warn "PRODUCTION database seed."
warn "Safe on a fresh database. On an existing DB, optional full seeds may delete/rebuild tenant slugs (test1, test2, demo) when included."
warn "Minimal tenants skip if the slug already exists."
echo ""
confirm_action "Proceed with production seed?"

if ! docker compose ps prod_api 2>/dev/null | grep -qE "Up|running"; then
  error "prod_api container is not running. Start the stack first with ./up.sh"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ -z "${SEED_PLATFORM_ADMIN_PASSWORD:-}" ]]; then
  error "SEED_PLATFORM_ADMIN_PASSWORD is not set in .env (required for seed)."
  exit 1
fi

info "Plan limits and platform admin are always seeded."
info "Optional tenants are chosen below."
echo ""

INCLUDE_TEST="false"
if prompt_include "Seed full sample data for test tenants test1 and test2? (unusual for prod)"; then
  INCLUDE_TEST="true"
fi

INCLUDE_RUBY="false"
if prompt_include "Seed minimal tenant ruby (Ruby)?"; then
  INCLUDE_RUBY="true"
fi

INCLUDE_DEMO="false"
if prompt_include "Seed full demo tenant (slug demo)?"; then
  INCLUDE_DEMO="true"
fi

echo -e "${COLOR_YELLOW}Optional minimal tenants (slug:Name or slug:Name:password, comma-separated).${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Leave empty to skip. Default admin password when omitted: ChangeMe123!${COLOR_RESET}"
read -r -p "Minimal tenants: " MINIMAL_LINE

MINIMAL_B64=""
if [[ -n "${MINIMAL_LINE// /}" ]]; then
  MINIMAL_B64="$(printf '%s' "$MINIMAL_LINE" | base64 | tr -d '\n')"
fi

step "Running prisma seed (orchestrated)..."
# Orchestration env is inlined in sh -c so it is not lost when docker compose exec -e
# does not reach Node. Platform admin / tenant passwords come from the container env_file (.env).
docker compose exec -T prod_api \
  sh -c "cd /app/apps/api && SEED_MODE=production SEED_INCLUDE_TEST=${INCLUDE_TEST} SEED_INCLUDE_RUBY=${INCLUDE_RUBY} SEED_INCLUDE_DEMO=${INCLUDE_DEMO} SEED_MINIMAL_TENANTS_B64=\"${MINIMAL_B64}\" node prisma/seed.js --orchestrated"

divider
success "Production seed complete!"
echo ""
echo "Summary:"
echo "  Platform admin: ${SEED_PLATFORM_ADMIN_USERNAME:-platform}"
echo "  Test tenants (test1, test2): ${INCLUDE_TEST}"
echo "  Ruby minimal: ${INCLUDE_RUBY}"
echo "  Demo tenant: ${INCLUDE_DEMO}"
if [[ -n "${MINIMAL_LINE// /}" ]]; then
  echo "  Minimal list: ${MINIMAL_LINE}"
fi
echo ""
