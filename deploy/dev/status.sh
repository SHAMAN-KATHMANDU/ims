#!/usr/bin/env bash
# =============================================================================
# deploy/dev/status.sh
# Show a dashboard of container status, resource usage, and disk usage.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

step "Dev/Stage Stack Status"
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
  dev_db dev_api dev_web dev_redis 2>/dev/null || \
  docker stats --no-stream 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 3. Docker volume disk usage
# -----------------------------------------------------------------------------
step "Volume Disk Usage"
docker system df -v 2>/dev/null | grep -E "(VOLUME NAME|dev_)" || \
  docker system df 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 4. Host disk
# -----------------------------------------------------------------------------
step "Host Disk Usage"
df -h / 2>/dev/null || true
echo ""

divider
info "Run './health.sh' for a quick web + API health probe."
echo ""
