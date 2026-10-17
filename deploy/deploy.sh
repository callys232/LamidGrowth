#!/usr/bin/env bash
# Redeploy script — run as the 'lamid' user from the repo root (~/app) after the first setup.
#   cd ~/app && ./deploy/deploy.sh
set -euo pipefail

git pull --ff-only
npm ci
npm run deployment:check
npm run release:check
pm2 restart lamid-api --update-env
pm2 save
echo "==> Deployed. Tail logs with: pm2 logs lamid-api"
