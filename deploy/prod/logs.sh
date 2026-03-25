#!/usr/bin/env bash
# =============================================================================
# deploy/prod/logs.sh
# View logs for production containers.
#
# Usage:
#   ./logs.sh                  -- last 100 lines from all services
#   ./logs.sh api              -- last 100 lines from prod_api
#   ./logs.sh web              -- last 100 lines from prod_web
#   ./logs.sh db               -- last 100 lines from prod_db
#   ./logs.sh redis            -- last 100 lines from prod_redis
#   ./logs.sh backup           -- last 100 lines from prod_db_backup
#   ./logs.sh api -f           -- follow api logs (Ctrl+C to stop)
#   ./logs.sh api --tail 50    -- last 50 lines from api
#   ./logs.sh api -f --tail 200 -- follow last 200 lines from api
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

# Parse arguments
TARGET=""
FOLLOW=false
TAIL_LINES=100
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--follow)
      FOLLOW=true
      shift
      ;;
    --tail)
      TAIL_LINES="$2"
      shift 2
      ;;
    --tail=*)
      TAIL_LINES="${1#--tail=}"
      shift
      ;;
    -*)
      EXTRA_ARGS+=("$1")
      shift
      ;;
    *)
      if [[ -z "$TARGET" ]]; then
        TARGET="$1"
      fi
      shift
      ;;
  esac
done

COMPOSE_ARGS=("--tail=${TAIL_LINES}")
if $FOLLOW; then
  COMPOSE_ARGS+=("-f")
fi
COMPOSE_ARGS+=("${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}")

if [[ -z "$TARGET" ]]; then
  docker compose logs "${COMPOSE_ARGS[@]}"
elif [[ "$TARGET" == "watchtower" ]]; then
  docker compose -f watchtower.yml logs "${COMPOSE_ARGS[@]}" watchtower
elif [[ -n "${SERVICE_MAP[$TARGET]:-}" ]]; then
  CONTAINER="${SERVICE_MAP[$TARGET]}"
  docker compose logs "${COMPOSE_ARGS[@]}" "$CONTAINER"
else
  error "Unknown service: '${TARGET}'"
  echo ""
  echo "Valid options: api, web, db, redis, backup, watchtower (or omit for all)"
  exit 1
fi
