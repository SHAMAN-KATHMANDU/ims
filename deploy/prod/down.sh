#!/usr/bin/env bash
# =============================================================================
# deploy/prod/down.sh
# Stop the full production stack (Watchtower first, then app containers).
#
# Usage:
#   ./down.sh            -- stop containers, keep all volumes (data preserved)
#   ./down.sh --volumes  -- stop containers AND remove named volumes
#                          (DANGER: destroys DB data -- backups are preserved
#                           since prod_db_backups uses a host bind mount)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

REMOVE_VOLUMES=false
if [[ "${1:-}" == "--volumes" ]]; then
  REMOVE_VOLUMES=true
fi

step "Stopping Production Stack"
divider

require_docker

# -----------------------------------------------------------------------------
# 1. Warn if --volumes
# -----------------------------------------------------------------------------
if $REMOVE_VOLUMES; then
  warn "WARNING: --volumes flag will DELETE Docker volumes (database data, redis data, uploads)."
  warn "Database backups in /home/ubuntu/backups are preserved (host bind mount)."
  confirm_action "This will permanently destroy production data. Continue?"
fi

# -----------------------------------------------------------------------------
# 2. Stop Watchtower first (so it doesn't restart containers while we stop them)
# -----------------------------------------------------------------------------
step "Stopping Watchtower..."
if docker compose -f watchtower.yml ps --quiet 2>/dev/null | grep -q .; then
  docker compose -f watchtower.yml down
  success "Watchtower stopped"
else
  info "Watchtower is not running -- skipping"
fi

# -----------------------------------------------------------------------------
# 3. Stop app stack
# -----------------------------------------------------------------------------
step "Stopping app containers..."
if $REMOVE_VOLUMES; then
  docker compose down --volumes
  success "App stack stopped and volumes removed"
  warn "Database backups at /home/ubuntu/backups are intact."
else
  docker compose down
  success "App stack stopped (volumes preserved)"
fi

divider
success "Production stack is down."
echo ""
echo "To start again: ./up.sh"
echo ""
