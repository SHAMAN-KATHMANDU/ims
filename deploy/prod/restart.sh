#!/usr/bin/env bash
# =============================================================================
# deploy/prod/restart.sh
# Restart one or all containers in the production stack.
#
# Usage:
#   ./restart.sh            -- restart all services
#   ./restart.sh api        -- restart prod_api only
#   ./restart.sh web        -- restart prod_web only
#   ./restart.sh db         -- restart prod_db only
#   ./restart.sh redis      -- restart prod_redis only
#   ./restart.sh backup     -- restart prod_db_backup only
#   ./restart.sh watchtower -- restart watchtower
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

# Map friendly names -> compose service names
declare -A SERVICE_MAP=(
  [api]="prod_api"
  [web]="prod_web"
  [db]="prod_db"
  [redis]="prod_redis"
  [backup]="prod_db_backup"
  [watchtower]="watchtower"
)

TARGET="${1:-all}"

if [[ "$TARGET" == "all" ]]; then
  step "Restarting all production services..."
  docker compose restart
  success "All services restarted"

elif [[ "$TARGET" == "watchtower" ]]; then
  step "Restarting Watchtower..."
  docker compose -f watchtower.yml restart watchtower
  success "Watchtower restarted"

elif [[ -n "${SERVICE_MAP[$TARGET]:-}" ]]; then
  CONTAINER="${SERVICE_MAP[$TARGET]}"
  step "Restarting ${CONTAINER}..."
  docker compose restart "$CONTAINER"
  success "${CONTAINER} restarted"

else
  error "Unknown service: '${TARGET}'"
  echo ""
  echo "Valid options: all, api, web, db, redis, backup, watchtower"
  exit 1
fi

echo ""
docker compose ps
echo ""
