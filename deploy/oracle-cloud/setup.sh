#!/usr/bin/env bash
# First-time Oracle Cloud VM setup for ZEBRA (Ubuntu 22.04 / 24.04).
# Run on the VM as a user with sudo:
#   curl -fsSL https://raw.githubusercontent.com/chandankmr925/ZEBRA/main/deploy/oracle-cloud/setup.sh | bash
# Or after cloning:
#   chmod +x deploy/oracle-cloud/setup.sh && ./deploy/oracle-cloud/setup.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/chandankmr925/ZEBRA.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/zebra}"
APP_USER="${APP_USER:-zebra}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required."
  exit 1
fi

echo "==> Updating system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

echo "==> Installing dependencies (git, nginx, build tools)..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  git curl ca-certificates nginx ufw

echo "==> Installing Node.js ${NODE_MAJOR}.x..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi
node -v
npm -v

echo "==> Creating app user ${APP_USER}..."
if ! id "$APP_USER" &>/dev/null; then
  sudo useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

echo "==> Cloning or updating application at ${INSTALL_DIR}..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  sudo git -C "$INSTALL_DIR" pull --ff-only
else
  sudo mkdir -p "$(dirname "$INSTALL_DIR")"
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
fi

sudo mkdir -p "$INSTALL_DIR/data/users" "$INSTALL_DIR/data/market-cache"
sudo chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR"

echo "==> Building application..."
sudo -u "$APP_USER" bash -c "cd '$INSTALL_DIR' && npm install && npm run build"

echo "==> Environment file /etc/zebra/zebra.env..."
sudo mkdir -p /etc/zebra
if [[ ! -f /etc/zebra/zebra.env ]]; then
  sudo cp "$INSTALL_DIR/deploy/oracle-cloud/zebra.env.example" /etc/zebra/zebra.env
  sudo chmod 600 /etc/zebra/zebra.env
fi

echo "==> Installing systemd service..."
sudo cp "$INSTALL_DIR/deploy/oracle-cloud/zebra.service" /etc/systemd/system/zebra.service
sudo systemctl daemon-reload
sudo systemctl enable zebra
sudo systemctl restart zebra

echo "==> Configuring nginx..."
sudo cp "$INSTALL_DIR/deploy/oracle-cloud/nginx-zebra.conf" /etc/nginx/sites-available/zebra
sudo ln -sf /etc/nginx/sites-available/zebra /etc/nginx/sites-enabled/zebra
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "==> Configuring firewall (ufw)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ""
echo "=============================================="
echo " ZEBRA setup complete"
echo "=============================================="
echo " App directory : $INSTALL_DIR"
echo " Service       : sudo systemctl status zebra"
echo " Logs          : sudo journalctl -u zebra -f"
echo ""
echo " Open in browser: http://$(curl -fsSL https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo ""
echo " IMPORTANT — Oracle Cloud Console:"
echo "   Networking → Virtual cloud network → Security List"
echo "   Add Ingress: TCP 80, 443 (and 22 for SSH) from 0.0.0.0/0"
echo ""
echo " Optional HTTPS (after DNS points to this VM):"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo " Edit secrets: sudo nano /etc/zebra/zebra.env"
echo " Redeploy    : sudo -u $APP_USER $INSTALL_DIR/deploy/oracle-cloud/deploy.sh"
