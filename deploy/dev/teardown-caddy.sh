#!/usr/bin/env bash
#
# deploy/dev/teardown-caddy.sh
#
# Rollback the Caddy cutover: stop dev_caddy + dev_tenant_site and restart
# host nginx. Use this if dev_caddy misbehaves during soak and you need to
# return to the pre-Phase-2 state.
#
# Safe to run multiple times.

set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Stopping websites profile services"
docker compose --profile websites stop dev_caddy dev_tenant_site 2>/dev/null || true
docker compose --profile websites rm -f dev_caddy dev_tenant_site 2>/dev/null || true

echo "▶ Re-enabling and starting host nginx"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl enable nginx
  sudo systemctl start nginx
  echo "  → nginx is back on :80 / :443"
else
  echo "  ⚠ systemctl not available — start nginx manually."
fi

echo
echo "✓ Rolled back to nginx. Platform hostnames (stage-ims.*, stage-api.*)"
echo "  should be reachable again within a minute."
echo
echo "Note: dev_caddy's issued TLS certs live in the caddy_data volume and are"
echo "preserved. You can re-run ./setup-caddy.sh later without re-issuing them."
