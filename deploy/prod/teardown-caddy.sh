#!/usr/bin/env bash
#
# deploy/prod/teardown-caddy.sh
#
# Rollback the Caddy cutover: stop prod_caddy + prod_tenant_site and restart
# host nginx. Use this if prod_caddy misbehaves during soak and you need to
# return to the pre-Caddy state.
#
# Safe to run multiple times.

set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Stopping websites profile services"
docker compose --profile websites stop prod_caddy prod_tenant_site 2>/dev/null || true
docker compose --profile websites rm -f prod_caddy prod_tenant_site 2>/dev/null || true

echo "▶ Re-enabling and starting host nginx"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl enable nginx
  sudo systemctl start nginx
  echo "  → nginx is back on :80 / :443"
else
  echo "  ⚠ systemctl not available — start nginx manually."
fi

echo
echo "✓ Rolled back to nginx. Platform hostnames (app.shamanyantra.com, api.shamanyantra.com)"
echo "  should be reachable again within a minute."
echo
echo "Note: prod_caddy's issued TLS certs live in the prod_caddy_data volume and are"
echo "preserved. You can re-run ./setup-caddy.sh later without re-issuing them."
