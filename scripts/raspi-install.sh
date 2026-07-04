#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/bpsr}"
SERVICE_NAME="${SERVICE_NAME:-bpsr-bot}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 22 first:"
  echo "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
  echo "sudo apt install -y nodejs"
  exit 1
fi

cd "$APP_DIR"
npm ci

if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env was created from .env.example. Edit it before starting the bot:"
  echo "nano $APP_DIR/.env"
  exit 1
fi

sudo cp bot/raspberry-pi-bpsr-bot.service.example "/etc/systemd/system/$SERVICE_NAME.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
