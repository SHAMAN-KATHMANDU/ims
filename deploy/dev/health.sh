#!/usr/bin/env bash
# =============================================================================
# deploy/dev/health.sh
# Quick health probe for the dev/stage stack.
# Exits 0 if all checks pass, 1 if any fail.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

ALL_PASS=true

step "Dev/Stage Health Check"
divider

# -----------------------------------------------------------------------------
# API health endpoint (GET /health -- checks DB connectivity)
# -----------------------------------------------------------------------------
echo -n "API  http://localhost:4000/health ... "
if curl -sf --max-time 5 http://localhost:4000/health > /tmp/ims_api_health.json 2>/dev/null; then
  STATUS=$(python3 -c "import json,sys; d=json.load(open('/tmp/ims_api_health.json')); print(d.get('status','?'))" 2>/dev/null || echo "ok")
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET} (${STATUS})"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET}"
  ALL_PASS=false
fi

# -----------------------------------------------------------------------------
# Web frontend (GET /)
# -----------------------------------------------------------------------------
echo -n "Web  http://localhost:3000       ... "
if curl -sf --max-time 5 http://localhost:3000 -o /dev/null 2>/dev/null; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET}"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET}"
  ALL_PASS=false
fi

# -----------------------------------------------------------------------------
# Database container health
# -----------------------------------------------------------------------------
echo -n "DB   container health            ... "
DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' dev_db 2>/dev/null || echo "not_found")
if [[ "$DB_STATUS" == "healthy" ]]; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET} (${DB_STATUS})"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET} (${DB_STATUS})"
  ALL_PASS=false
fi

# -----------------------------------------------------------------------------
# Redis ping
# -----------------------------------------------------------------------------
echo -n "Redis container health           ... "
REDIS_STATUS=$(docker inspect --format='{{.State.Health.Status}}' dev_redis 2>/dev/null || echo "not_found")
if [[ "$REDIS_STATUS" == "healthy" ]]; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET} (${REDIS_STATUS})"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET} (${REDIS_STATUS})"
  ALL_PASS=false
fi

divider

if $ALL_PASS; then
  success "All health checks passed"
  exit 0
else
  error "One or more health checks failed"
  echo ""
  echo "Debug tips:"
  echo "  ./logs.sh api -f   -- check API logs for startup errors"
  echo "  ./logs.sh db       -- check database logs"
  echo "  ./status.sh        -- full container status"
  exit 1
fi
