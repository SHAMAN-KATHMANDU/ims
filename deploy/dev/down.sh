#!/usr/bin/env bash
# =============================================================================
# deploy/dev/down.sh
# Stop the full dev/stage stack (Watchtower first, then app containers).
#
# Usage:
#   ./down.sh            -- stop containers, keep volumes (data preserved)
#   ./down.sh --volumes  -- stop containers AND remove all volumes (DATA LOSS!)
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

step "Stopping Dev/Stage Stack"
divider

require_docker

# -----------------------------------------------------------------------------
# 1. Warn if --volumes
# -----------------------------------------------------------------------------
if $REMOVE_VOLUMES; then
  warn "WARNING: --volumes flag will DELETE all Docker volumes (database data, redis data)."
  confirm_action "This will permanently destroy all dev data. Continue?"
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
else
  docker compose down
  success "App stack stopped (volumes preserved)"
fi

divider
success "Dev/Stage stack is down."
echo ""
echo "To start again: ./up.sh"
echo ""
