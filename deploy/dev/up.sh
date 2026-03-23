#!/usr/bin/env bash
# =============================================================================
# deploy/dev/up.sh
# Start the full dev/stage stack: app containers + Watchtower.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

step "Starting Dev/Stage Stack"
divider

require_docker
require_env "."

# -----------------------------------------------------------------------------
# 1. Start app stack
# -----------------------------------------------------------------------------
step "Starting app stack (db, redis, api, web)..."
docker compose up -d
success "App stack started"

# -----------------------------------------------------------------------------
# 2. Wait for database to be healthy
# -----------------------------------------------------------------------------
step "Waiting for database..."
wait_for_health "dev_db" 60

# -----------------------------------------------------------------------------
# 3. Wait for API to be healthy
# -----------------------------------------------------------------------------
step "Waiting for API..."
wait_for_health "dev_api" 90

# -----------------------------------------------------------------------------
# 4. Start Watchtower
# -----------------------------------------------------------------------------
step "Starting Watchtower (auto-pull :dev images every 30s)..."
docker compose -f watchtower.yml up -d
success "Watchtower started"

# -----------------------------------------------------------------------------
# 5. Print summary
# -----------------------------------------------------------------------------
divider
success "Dev/Stage stack is up!"
echo ""
docker compose ps
echo ""
echo "Endpoints:"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000"
echo "  API health: http://localhost:4000/health"
echo ""
echo "Useful commands:"
echo "  ./logs.sh api -f     -- follow API logs"
echo "  ./status.sh          -- container status + resource usage"
echo "  ./health.sh          -- quick health probe"
echo "  ./restart.sh api     -- restart a specific service"
echo "  ./down.sh            -- stop everything"
echo ""
