#!/usr/bin/env bash
# One-time provisioning for a fresh AlmaLinux / Rocky Linux / CentOS Stream VPS.
# Run as root (or with sudo) once, over SSH:
#   curl -fsSL https://raw.githubusercontent.com/callys232/LamidGrowth/main/deploy/setup-vps.sh | bash
# or copy this file to the VPS and run it directly.
set -euo pipefail

echo "==> Updating system packages"
dnf -y update

echo "==> Installing firewalld and opening SSH/HTTP/HTTPS"
dnf -y install firewalld
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

echo "==> Installing Node.js 22 (NodeSource)"
dnf -y install curl
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf -y install nodejs
node -v
npm -v

echo "==> Installing git and nginx"
dnf -y install git nginx
systemctl enable --now nginx

echo "==> Installing PM2 (process manager) globally"
npm install -g pm2

echo "==> Installing certbot for Let's Encrypt SSL"
dnf -y install epel-release
dnf -y install certbot python3-certbot-nginx

echo "==> Creating a dedicated non-root app user (lamid)"
id -u lamid &>/dev/null || useradd -m -s /bin/bash lamid

echo "==> Allowing nginx to proxy to a local Node process (SELinux)"
setsebool -P httpd_can_network_connect 1

cat <<'EOF'

==> Base provisioning done. Next steps (as the 'lamid' user):

  sudo su - lamid
  git clone https://github.com/callys232/LamidGrowth.git app
  cd app
  npm ci
  nano .env               # paste production secrets — see deploy/README.md
  npm run build
  pm2 start deploy/ecosystem.config.cjs
  pm2 save

Then, back as root, point nginx at it:
  cp app/deploy/nginx-api.conf /etc/nginx/conf.d/api.conf
  nginx -t && systemctl reload nginx
  certbot --nginx -d api.lamidconsulting.com

And enable PM2 on boot (as root, using the exact command pm2 startup prints for the lamid user):
  su - lamid -c 'pm2 startup' | tail -1   # copy the printed sudo ... command and run it as root
  su - lamid -c 'pm2 save'

EOF
