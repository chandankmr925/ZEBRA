#!/usr/bin/env bash
# Pull latest code, rebuild, and restart ZEBRA.
# Run on the VM as your SSH user (ubuntu) with sudo:
#   sudo /opt/zebra/deploy/oracle-cloud/deploy.sh

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/zebra}"
APP_USER="${APP_USER:-zebra}"

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "Missing $INSTALL_DIR — run setup.sh first."
  exit 1
fi

echo "==> Pulling latest from git..."
sudo -u "$APP_USER" git -C "$INSTALL_DIR" pull --ff-only

echo "==> Installing dependencies and building..."
sudo -u "$APP_USER" bash -c "cd '$INSTALL_DIR' && npm install && npm run build"

echo "==> Restarting zebra service..."
sudo systemctl restart zebra
sudo systemctl status zebra --no-pager || true

echo "==> Deploy complete."
