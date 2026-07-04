#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/bpsr}"
SERVICE_NAME="${SERVICE_NAME:-bpsr-bot}"

cd "$APP_DIR"
git pull
npm ci
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
