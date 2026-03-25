#!/usr/bin/env bash
# =============================================================================
# deploy/dev/restart.sh
# Restart one or all containers in the dev/stage stack.
#
# Usage:
#   ./restart.sh           -- restart all services
#   ./restart.sh api       -- restart dev_api only
#   ./restart.sh web       -- restart dev_web only
#   ./restart.sh db        -- restart dev_db only
#   ./restart.sh redis     -- restart dev_redis only
#   ./restart.sh backup     -- restart dev_db_backup only
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
  [api]="dev_api"
  [web]="dev_web"
  [db]="dev_db"
  [redis]="dev_redis"
  [backup]="dev_db_backup"
  [watchtower]="watchtower"
)

TARGET="${1:-all}"

if [[ "$TARGET" == "all" ]]; then
  step "Restarting all dev services..."
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
