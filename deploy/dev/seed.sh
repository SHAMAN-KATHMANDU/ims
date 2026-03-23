#!/usr/bin/env bash
# =============================================================================
# deploy/dev/seed.sh
# Orchestrated Prisma seed for dev/stage (EC2). Run from this folder.
#
# Always seeds: plan limits + platform admin (credentials from .env).
# Optional blocks: chosen interactively (type "yes" to include).
#
# Usage:
#   ./seed.sh          -- interactive seed
#   ./seed.sh --reset  -- drop + re-create all data (WARNING), then interactive seed
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

# -----------------------------------------------------------------------------
# Prompts: type "yes" to include
# -----------------------------------------------------------------------------
prompt_include() {
  local prompt_text="$1"
  echo -e "${COLOR_YELLOW}${prompt_text}${COLOR_RESET}"
  read -r -p "Type 'yes' to include, anything else to skip: " answer
  [[ "$answer" == "yes" ]]
}

step "Database Seed (Dev/Stage)"
divider

if ! docker compose ps dev_api | grep -qE "Up|running"; then
  error "dev_api container is not running. Start the stack first with ./up.sh"
  exit 1
fi

if $RESET_MODE; then
  warn "Reset mode: this will DROP all data and re-seed from scratch."
  confirm_action "Destroy all dev data and re-seed?"
  step "Resetting database..."
  docker compose exec dev_api sh -c "cd /app/apps/api && npx prisma migrate reset --force"
  success "Database reset"
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
if prompt_include "Seed full sample data for test tenants test1 and test2?"; then
  INCLUDE_TEST="true"
fi

INCLUDE_RUBY="false"
if prompt_include "Seed minimal tenant ruby (Ruby)?"; then
  INCLUDE_RUBY="true"
fi

INCLUDE_DEMO="false"
if prompt_include "Seed full demo tenant (slug demo, password demo)?"; then
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
docker compose exec -T dev_api \
  sh -c "cd /app/apps/api && SEED_MODE=development SEED_INCLUDE_TEST=${INCLUDE_TEST} SEED_INCLUDE_RUBY=${INCLUDE_RUBY} SEED_INCLUDE_DEMO=${INCLUDE_DEMO} SEED_MINIMAL_TENANTS_B64=\"${MINIMAL_B64}\" node prisma/seed.js --orchestrated"

divider
success "Seed complete!"
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
