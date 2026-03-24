#!/usr/bin/env bash
# =============================================================================
# deploy/prod/setup.sh
# First-time setup for the PRODUCTION EC2 instance.
# Run this once before ./up.sh on a fresh server.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

step "Production EC2 -- First-time Setup"
divider

# -----------------------------------------------------------------------------
# 1. Check Docker
# -----------------------------------------------------------------------------
step "Checking Docker..."
require_docker

# -----------------------------------------------------------------------------
# 2. Create .env from template
# -----------------------------------------------------------------------------
step "Environment file..."
if [[ -f ".env" ]]; then
  success ".env already exists -- skipping copy"
else
  cp .env.example .env
  success "Created .env from .env.example"
  warn "You MUST edit .env before starting the stack."
  warn "Required: POSTGRES_PASSWORD, JWT_SECRET, DATABASE_URL, CORS_ORIGIN, API_PUBLIC_URL, CREDENTIAL_ENCRYPTION_KEY"
  echo ""
  read -r -p "Press ENTER to open .env in nano (or Ctrl+C to edit manually)..." _
  nano .env
fi

# -----------------------------------------------------------------------------
# 3. Validate required env vars
# -----------------------------------------------------------------------------
step "Validating required env vars..."
validate_required_vars \
  POSTGRES_PASSWORD \
  JWT_SECRET \
  DATABASE_URL \
  CORS_ORIGIN \
  API_PUBLIC_URL \
  REDIS_URL \
  CREDENTIAL_ENCRYPTION_KEY
success "All required vars are set"

# Safety checks
set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ "$JWT_SECRET" == "STRONG-RANDOM-SECRET-AT-LEAST-64-CHARS-LONG" ]]; then
  error "JWT_SECRET is still the placeholder value. Set a real secret."
  exit 1
fi
if [[ "$POSTGRES_PASSWORD" == "STRONG-RANDOM-PASSWORD-HERE" ]]; then
  error "POSTGRES_PASSWORD is still the placeholder value. Set a real password."
  exit 1
fi
success "Placeholder values replaced"

# -----------------------------------------------------------------------------
# 4. Create backup directory on host
# -----------------------------------------------------------------------------
step "Creating backup directory..."
mkdir -p /home/ubuntu/backups
chmod 750 /home/ubuntu/backups
success "Backup directory ready: /home/ubuntu/backups"

# -----------------------------------------------------------------------------
# 5. Docker Hub login (for pulling private images / Watchtower)
# -----------------------------------------------------------------------------
step "Docker Hub login..."
echo ""
echo "If your Docker Hub images (rpandox/dev-api-ims, rpandox/dev-web-ims) are private,"
echo "you need to log in so Watchtower can pull them."
echo ""
read -r -p "Log in to Docker Hub now? [y/N] " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  docker login
  success "Docker Hub login successful"
else
  info "Skipped Docker Hub login -- make sure images are public or login before running ./up.sh"
fi

divider
success "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run:  ./up.sh             -- start the full stack"
echo "  2. Run:  ./health.sh         -- verify web + API are running"
echo "  3. Run:  ./seed.sh           -- seed the database (first time only)"
echo "  4. Run:  ./setup-nginx.sh    -- configure nginx + HTTPS"
echo "  5. Run:  ./setup-backups.sh -- offsite S3 sync (DB, uploads, .env; after terraform IAM profile)"
echo ""
