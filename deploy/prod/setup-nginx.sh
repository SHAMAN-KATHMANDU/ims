#!/usr/bin/env bash
# =============================================================================
# deploy/prod/setup-nginx.sh
# Install and configure nginx + Let's Encrypt HTTPS for the production EC2.
#
# Domains:
#   www.shamanyantra.com   -> web (port 3000)
#   api.shamanyantra.com   -> api (port 4000)
#
# Prerequisites:
#   - DNS A records for both domains must point to this server's public IP
#   - Run as root (sudo ./setup-nginx.sh)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

require_root

WEB_DOMAIN="www.shamanyantra.com"
API_DOMAIN="api.shamanyantra.com"
NGINX_CONF_NAME="ims-prod"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_CONF_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_CONF_NAME}.conf"

step "Nginx + HTTPS Setup (Production)"
divider

# -----------------------------------------------------------------------------
# 1. Install nginx and certbot
# -----------------------------------------------------------------------------
step "Installing nginx and certbot..."
if ! command -v nginx &>/dev/null; then
  apt-get update -q
  apt-get install -y nginx
  success "nginx installed"
else
  success "nginx already installed ($(nginx -v 2>&1 | head -1))"
fi

if ! command -v certbot &>/dev/null; then
  apt-get update -q
  apt-get install -y certbot python3-certbot-nginx
  success "certbot installed"
else
  success "certbot already installed"
fi

# -----------------------------------------------------------------------------
# 2. Copy nginx config
# -----------------------------------------------------------------------------
step "Installing nginx config..."
cp "${SCRIPT_DIR}/nginx.conf" "$NGINX_AVAILABLE"
success "Copied nginx.conf -> ${NGINX_AVAILABLE}"

# Remove default site (can interfere with our config)
if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
  rm -f "/etc/nginx/sites-enabled/default"
  info "Removed default nginx site"
fi

# Symlink into sites-enabled
if [[ ! -L "$NGINX_ENABLED" ]]; then
  ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  success "Enabled: ${NGINX_ENABLED}"
else
  success "Already enabled: ${NGINX_ENABLED}"
fi

# -----------------------------------------------------------------------------
# 3. Test and reload nginx
# -----------------------------------------------------------------------------
step "Testing nginx config..."
nginx -t
success "nginx config is valid"

step "Reloading nginx..."
systemctl reload nginx
success "nginx reloaded"

# -----------------------------------------------------------------------------
# 4. Obtain Let's Encrypt certificates
# -----------------------------------------------------------------------------
step "Requesting HTTPS certificates..."
echo ""
SERVER_IP=$(curl -sf --max-time 3 https://api.ipify.org 2>/dev/null || echo '<this server IP>')
warn "DNS A records must already point to this server before certbot can succeed."
warn "  ${WEB_DOMAIN} -> ${SERVER_IP}"
warn "  ${API_DOMAIN} -> ${SERVER_IP}"
echo ""
read -r -p "Run certbot now? [y/N] " answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
  certbot --nginx \
    -d "${WEB_DOMAIN}" \
    -d "${API_DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "admin@shamanyantra.com"
  success "HTTPS certificates obtained!"

  step "Reloading nginx with HTTPS config..."
  systemctl reload nginx
  success "nginx reloaded with HTTPS"
else
  info "Skipped certbot. Run manually when DNS is ready:"
  echo ""
  echo "  sudo certbot --nginx -d ${WEB_DOMAIN} -d ${API_DOMAIN}"
  echo ""
fi

# -----------------------------------------------------------------------------
# 5. Enable certbot auto-renewal
# -----------------------------------------------------------------------------
step "Verifying certbot auto-renewal timer..."
if systemctl is-enabled certbot.timer &>/dev/null; then
  success "certbot.timer is enabled (auto-renewal active)"
else
  systemctl enable certbot.timer 2>/dev/null || true
  info "certbot.timer enabled for auto-renewal"
fi

divider
success "Nginx setup complete!"
echo ""
echo "Verify:"
echo "  https://${WEB_DOMAIN}"
echo "  https://${API_DOMAIN}/health"
echo ""
echo "Facebook Messenger webhook URL (configure in Meta App Dashboard):"
echo "  https://${API_DOMAIN}/api/v1/webhooks/messenger"
echo ""
echo "Socket.IO WebSocket URL (used by web app):"
echo "  wss://${API_DOMAIN}/ws/"
echo ""
