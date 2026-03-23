#!/usr/bin/env bash
# =============================================================================
# deploy/prod/backup-s3.sh
# Sync local DB backups, prod uploads volume, and .env to S3. Requires IAM instance profile.
# Cron: install via ./setup-backups.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

BACKUPS_BUCKET="${BACKUPS_BUCKET:-ims-shaman-backups}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION
ENV_PREFIX="prod"
KEEP_ENV_COPIES=30

step "S3 offsite backup (${ENV_PREFIX})"
divider

if ! command -v aws &>/dev/null; then
  info "Installing awscli..."
  sudo apt-get update -qq
  sudo apt-get install -y awscli
fi

mkdir -p /home/ubuntu/backups

# -----------------------------------------------------------------------------
# DB dumps
# -----------------------------------------------------------------------------
if [[ -d /home/ubuntu/backups ]] && compgen -G '/home/ubuntu/backups/*' > /dev/null; then
  step "Syncing DB backup files to s3://${BACKUPS_BUCKET}/${ENV_PREFIX}/db/"
  aws s3 sync /home/ubuntu/backups "s3://${BACKUPS_BUCKET}/${ENV_PREFIX}/db/" \
    --exclude "s3-sync.log" \
    --delete
  success "DB backups synced"
else
  info "No files in /home/ubuntu/backups yet"
fi

# -----------------------------------------------------------------------------
# Uploads volume (Docker named volume -> host mountpoint)
# -----------------------------------------------------------------------------
step "Syncing prod uploads to s3://${BACKUPS_BUCKET}/${ENV_PREFIX}/uploads/"
UPLOADS_MP=""
# Compose project name is usually the deploy directory name (e.g. deploy_prod_uploads)
if docker volume inspect deploy_prod_uploads &>/dev/null; then
  UPLOADS_MP=$(docker volume inspect deploy_prod_uploads --format '{{ .Mountpoint }}')
elif VOL=$(docker volume ls -q | grep -E 'prod_uploads$' | head -1); then
  UPLOADS_MP=$(docker volume inspect "$VOL" --format '{{ .Mountpoint }}')
fi

if [[ -n "${UPLOADS_MP}" && -d "${UPLOADS_MP}" ]]; then
  aws s3 sync "${UPLOADS_MP}" "s3://${BACKUPS_BUCKET}/${ENV_PREFIX}/uploads/" --delete
  success "Uploads synced from ${UPLOADS_MP}"
else
  info "prod_uploads volume not found or empty yet -- skipping uploads sync"
fi

# -----------------------------------------------------------------------------
# .env
# -----------------------------------------------------------------------------
if [[ -f /home/ubuntu/deploy/.env ]]; then
  step "Uploading .env snapshot"
  TS=$(date +%Y%m%d-%H%M%S)
  aws s3 cp /home/ubuntu/deploy/.env "s3://${BACKUPS_BUCKET}/${ENV_PREFIX}/env/.env.${TS}"
  success "Uploaded .env.${TS}"

  step "Pruning old .env backups in S3 (keep last ${KEEP_ENV_COPIES})"
  mapfile -t keys < <(aws s3api list-objects-v2 \
    --bucket "${BACKUPS_BUCKET}" \
    --prefix "${ENV_PREFIX}/env/" \
    --query 'Contents[].Key' \
    --output text 2>/dev/null | tr '\t' '\n' | grep -E '\.env\.[0-9]{8}-[0-9]{6}$' | sort -r || true)

  count=${#keys[@]}
  if (( count > KEEP_ENV_COPIES )); then
    for ((i = KEEP_ENV_COPIES; i < count; i++)); do
      aws s3 rm "s3://${BACKUPS_BUCKET}/${keys[$i]}"
      info "Removed old: ${keys[$i]}"
    done
  fi
else
  info "No /home/ubuntu/deploy/.env -- skipping env backup"
fi

divider
success "S3 backup run complete"
