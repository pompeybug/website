#!/bin/bash
# Run on the VPS: ./deploy.sh
# The GitHub Actions deploy key is locked to this script (authorized_keys
# command=), so this file decides what a deploy does.
set -euo pipefail

APP=pcf-website
DIR=~/github/$APP

source ~/.nvm/nvm.sh
cd "$DIR"
git pull --ff-only
npm ci --omit=dev

if pm2 describe "$APP" > /dev/null 2>&1; then
  pm2 restart "$APP" --update-env
else
  pm2 start npm --name "$APP" --max-memory-restart 350M -- start
  pm2 save
fi

echo "Deploy complete."
