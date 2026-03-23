#!/usr/bin/env bash
# =============================================================================
# deploy/prod/up.sh
# Start the full production stack: app containers + backup service + Watchtower.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

step "Starting Production Stack"
divider

require_docker
require_env "."

# -----------------------------------------------------------------------------
# Pre-flight: backup directory must exist (bind mount for prod_db_backups volume)
# -----------------------------------------------------------------------------
if [[ ! -d "/home/ubuntu/backups" ]]; then
  warn "Backup directory /home/ubuntu/backups does not exist."
  warn "Creating it now (run ./setup.sh for full first-time setup)."
  mkdir -p /home/ubuntu/backups
  chmod 750 /home/ubuntu/backups
  success "Created /home/ubuntu/backups"
fi

# -----------------------------------------------------------------------------
# 1. Start app stack (db, backup, redis, api, web)
# -----------------------------------------------------------------------------
step "Starting app stack (db, backup, redis, api, web)..."
docker compose up -d
success "App stack started"

# -----------------------------------------------------------------------------
# 2. Wait for database to be healthy
# -----------------------------------------------------------------------------
step "Waiting for database..."
wait_for_health "prod_db" 60

# -----------------------------------------------------------------------------
# 3. Wait for API to be healthy
# -----------------------------------------------------------------------------
step "Waiting for API..."
wait_for_health "prod_api" 90

# -----------------------------------------------------------------------------
# 4. Start Watchtower
# -----------------------------------------------------------------------------
step "Starting Watchtower (auto-pull :prod images every 30s)..."
docker compose -f watchtower.yml up -d
success "Watchtower started"

# -----------------------------------------------------------------------------
# 5. Print summary
# -----------------------------------------------------------------------------
divider
success "Production stack is up!"
echo ""
docker compose ps
echo ""
echo "Endpoints:"
echo "  Web: http://localhost:3000  (nginx -> https://app.shamanyantra.com)"
echo "  API: http://localhost:4000  (nginx -> https://api.shamanyantra.com)"
echo "  API health: http://localhost:4000/health"
echo ""
echo "Useful commands:"
echo "  ./logs.sh api -f       -- follow API logs"
echo "  ./status.sh            -- container status + resource usage"
echo "  ./health.sh            -- quick health probe"
echo "  ./restart.sh api       -- restart a specific service"
echo "  ./backup-db.sh         -- on-demand manual database backup"
echo "  ./setup-backups.sh     -- S3 offsite backup (cron + ./backup-s3.sh)"
echo "  ./down.sh              -- stop everything"
echo ""
