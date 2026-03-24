#!/usr/bin/env bash
# =============================================================================
# deploy/prod/backup-db.sh
# On-demand manual database backup for production.
#
# Automated daily backups run via the prod_db_backup container in docker-compose.yml.
# Use this script for:
#   - Immediate backup before a risky migration or deployment
#   - Verifying backup integrity manually
#   - Offsite copy before destructive operations
#
# Backup location: /home/ubuntu/backups/
# Retention: keeps last 14 manual backups (automated backups have their own retention)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker
require_env "."

BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/manual-ims-${TIMESTAMP}.sql.gz"
KEEP_MANUAL=14

step "Manual Database Backup (Production)"
divider

# Load env
set -a
# shellcheck source=/dev/null
source .env
set +a

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
if ! docker compose ps prod_db 2>/dev/null | grep -qE "Up|running"; then
  error "prod_db container is not running."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
info "Backup directory: ${BACKUP_DIR}"
info "Output file:      ${BACKUP_FILE}"

# -----------------------------------------------------------------------------
# Run pg_dump
# -----------------------------------------------------------------------------
step "Running pg_dump..."
docker compose exec -T prod_db \
  pg_dump \
    --username="${POSTGRES_USER:-postgres}" \
    --dbname="${POSTGRES_DB:-ims}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --format=plain \
  | gzip > "$BACKUP_FILE"

# Verify the file was created and is non-empty
if [[ ! -s "$BACKUP_FILE" ]]; then
  error "Backup file is empty or was not created: ${BACKUP_FILE}"
  exit 2
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
success "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# -----------------------------------------------------------------------------
# Rotate old manual backups (keep last N)
# -----------------------------------------------------------------------------
step "Rotating old manual backups (keeping last ${KEEP_MANUAL})..."
MANUAL_BACKUPS=($(ls -t "${BACKUP_DIR}"/manual-ims-*.sql.gz 2>/dev/null))
COUNT=${#MANUAL_BACKUPS[@]}

if [[ $COUNT -gt $KEEP_MANUAL ]]; then
  TO_DELETE=("${MANUAL_BACKUPS[@]:$KEEP_MANUAL}")
  for f in "${TO_DELETE[@]}"; do
    rm -f "$f"
    info "Deleted old backup: $(basename "$f")"
  done
  success "Kept ${KEEP_MANUAL} most recent manual backups, deleted $((COUNT - KEEP_MANUAL)) old ones"
else
  info "Total manual backups: ${COUNT} (under limit of ${KEEP_MANUAL}, no rotation needed)"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
divider
success "Backup complete!"
echo ""
echo "Latest manual backups:"
ls -lht "${BACKUP_DIR}"/manual-ims-*.sql.gz 2>/dev/null | head -5 | awk '{print "  "$0}' || echo "  (none)"
echo ""
echo "To restore:"
echo "  gunzip -c ${BACKUP_FILE} | docker compose exec -T prod_db psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-ims}"
echo ""
