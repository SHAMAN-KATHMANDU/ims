#!/usr/bin/env bash
# =============================================================================
# deploy/prod/status.sh
# Show a dashboard of container status, resource usage, and disk usage.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

step "Production Stack Status"
divider

# -----------------------------------------------------------------------------
# 1. Container status
# -----------------------------------------------------------------------------
step "Container Status"
docker compose ps
echo ""
if docker compose -f watchtower.yml ps --quiet 2>/dev/null | grep -q .; then
  echo "Watchtower:"
  docker compose -f watchtower.yml ps
  echo ""
fi

# -----------------------------------------------------------------------------
# 2. Resource usage (CPU, memory, network I/O)
# -----------------------------------------------------------------------------
step "Resource Usage (CPU / Memory / Net I/O)"
docker stats --no-stream \
  --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" \
  prod_db prod_redis prod_api prod_web prod_db_backup 2>/dev/null || \
  docker stats --no-stream 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 3. Docker volume disk usage
# -----------------------------------------------------------------------------
step "Volume Disk Usage"
docker system df -v 2>/dev/null | grep -E "(VOLUME NAME|prod_)" || \
  docker system df 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 4. Backup directory
# -----------------------------------------------------------------------------
step "Database Backups (/home/ubuntu/backups)"
if [[ -d "/home/ubuntu/backups" ]]; then
  BACKUP_COUNT=$(find /home/ubuntu/backups -name "*.sql.gz" 2>/dev/null | wc -l)
  BACKUP_SIZE=$(du -sh /home/ubuntu/backups 2>/dev/null | cut -f1)
  echo "  Files: ${BACKUP_COUNT} backup(s)"
  echo "  Size:  ${BACKUP_SIZE}"
  echo "  Latest:"
  ls -lht /home/ubuntu/backups/*.sql.gz 2>/dev/null | head -3 | awk '{print "    "$0}' || echo "    (none yet)"
else
  warn "/home/ubuntu/backups directory does not exist -- run ./setup.sh"
fi
echo ""

# -----------------------------------------------------------------------------
# 5. Host disk
# -----------------------------------------------------------------------------
step "Host Disk Usage"
df -h / 2>/dev/null || true
echo ""

divider
info "Run './health.sh' for a quick web + API health probe."
info "Run './backup-db.sh' for an on-demand manual database backup."
info "S3 offsite: ./setup-backups.sh (once), then tail -f /home/ubuntu/backups/s3-sync.log"
echo ""
