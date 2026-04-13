#!/usr/bin/env bash
#
# deploy/dev/setup-caddy.sh
#
# Dev/stage one-time setup for the Caddy edge proxy. Run this on the EC2 host
# AFTER the Phase 1 backend is deployed (/internal/domain-allowed live) and
# BEFORE you start the `websites` compose profile.
#
# What this script does:
#   1. Stops the host nginx service (nginx will be retired from the TLS path
#      on dev as part of the cutover to Caddy — decision §6.1 of the plan).
#   2. Verifies that .env has INTERNAL_API_TOKEN, REVALIDATE_SECRET, and
#      API_PUBLIC_URL populated. Refuses to proceed otherwise.
#   3. Pulls the Caddy image.
#   4. Starts the `websites` profile services (dev_caddy + dev_tenant_site).
#   5. Tails Caddy logs so you can watch ACME kick off for stage hostnames.
#
# Rollback:
#   ./teardown-caddy.sh   # stops dev_caddy + dev_tenant_site, restarts nginx
#
# WARNING: This script touches :80 and :443 on the EC2 host. DO NOT run on
# prod until dev has soaked for at least 72h. See README-caddy-migration.md.

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "✗ deploy/dev/.env is missing. Copy .env.example and fill it in first."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

fatal() { echo "✗ $1" >&2; exit 1; }
note()  { echo "  → $1"; }

echo "▶ Pre-flight checks"
[ -n "${INTERNAL_API_TOKEN:-}" ] || fatal "INTERNAL_API_TOKEN is not set in deploy/dev/.env"
[ ${#INTERNAL_API_TOKEN} -ge 32 ] || fatal "INTERNAL_API_TOKEN must be >= 32 chars"
[ -n "${REVALIDATE_SECRET:-}" ]   || fatal "REVALIDATE_SECRET is not set in deploy/dev/.env"
[ -n "${API_PUBLIC_URL:-}" ]      || fatal "API_PUBLIC_URL is not set in deploy/dev/.env"

note "Environment looks good."

echo "▶ Stopping host nginx (retired from TLS path on dev)"
if systemctl is-active --quiet nginx 2>/dev/null; then
  sudo systemctl stop nginx
  sudo systemctl disable nginx
  note "nginx stopped and disabled. You can re-enable it via teardown-caddy.sh if you need to roll back."
else
  note "nginx is not running — nothing to stop."
fi

echo "▶ Pulling Caddy + tenant-site images"
docker compose --profile websites pull dev_caddy dev_tenant_site

echo "▶ Starting websites profile"
docker compose --profile websites up -d dev_tenant_site dev_caddy

echo "▶ Waiting for Caddy to be ready"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec dev_caddy caddy version >/dev/null 2>&1; then
    note "Caddy is up."
    break
  fi
  sleep 2
done

echo "▶ Verifying the ask hook can reach the API"
set +e
RESP=$(docker exec dev_caddy wget -qO- \
  "http://dev_api:4000/api/v1/internal/domain-allowed?_t=${INTERNAL_API_TOKEN}&domain=example.com" \
  2>&1)
STATUS=$?
set -e
if [ $STATUS -eq 0 ] || [ $STATUS -eq 1 ]; then
  note "Ask hook reachable (API responded). Caddy will now issue certs on demand."
else
  echo "✗ Caddy container cannot reach dev_api:4000 — investigate networking."
  exit 1
fi

echo
echo "✓ Caddy is live on :80 and :443"
echo
echo "Next steps:"
echo "  1. Point stage-ims.shamankathmandu.com and stage-api.shamankathmandu.com at this host (already done)."
echo "  2. Visit https://stage-ims.shamankathmandu.com in a browser — Caddy should fetch a fresh cert via ACME."
echo "  3. Add a test tenant domain, verify TXT, and hit it with curl to test the on-demand TLS path:"
echo "       curl -v https://<your-test-domain>/"
echo "  4. Tail Caddy logs:"
echo "       docker logs -f dev_caddy"
echo
echo "To roll back to nginx:"
echo "  ./teardown-caddy.sh"
