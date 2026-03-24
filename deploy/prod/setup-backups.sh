#!/usr/bin/env bash
# =============================================================================
# deploy/prod/setup-backups.sh
# One-time: ensure AWS CLI, verify IAM instance profile, install nightly S3 sync cron.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

BACKUPS_BUCKET="${BACKUPS_BUCKET:-ims-shaman-backups}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION
CRON_MARKER="ims-infra-backup-s3-prod"

step "Offsite backup setup (production)"
divider

if ! command -v aws &>/dev/null; then
  step "Installing awscli..."
  sudo apt-get update -qq
  sudo apt-get install -y awscli
  success "awscli installed"
else
  success "awscli already present"
fi

step "Verifying IAM instance profile (STS)..."
if ! aws sts get-caller-identity &>/dev/null; then
  error "AWS credentials not available. Attach ims-ec2-backup-profile to this instance (terraform apply) and retry."
  exit 1
fi
aws sts get-caller-identity
success "IAM credentials OK"

step "Ensuring backup directory exists..."
sudo mkdir -p /home/ubuntu/backups
sudo chown ubuntu:ubuntu /home/ubuntu/backups
chmod 750 /home/ubuntu/backups

step "Making backup script executable..."
chmod +x "${SCRIPT_DIR}/backup-s3.sh"

CRON_LINE="0 2 * * * BACKUPS_BUCKET=${BACKUPS_BUCKET} AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION} ${SCRIPT_DIR}/backup-s3.sh >> /home/ubuntu/backups/s3-sync.log 2>&1 # ${CRON_MARKER}"

step "Installing cron job (02:00 daily)..."
( crontab -l 2>/dev/null | grep -v "${CRON_MARKER}" || true
  echo "${CRON_LINE}"
) | crontab -
success "Cron installed"

divider
success "Setup complete. Test with: BACKUPS_BUCKET=${BACKUPS_BUCKET} ./backup-s3.sh"
echo ""
echo "Logs: tail -f /home/ubuntu/backups/s3-sync.log"
echo ""
