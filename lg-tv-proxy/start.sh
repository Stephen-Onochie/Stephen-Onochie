#!/usr/bin/env bash
# Start the LG TV proxy. Installs dependencies on first run.
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found — creating one from .env.example."
  echo "Edit lg-tv-proxy/.env to set TV_IP, API_TOKEN, and ALLOWED_ORIGINS, then re-run."
  cp .env.example .env
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run)…"
  npm install
fi

echo "Starting LG TV proxy…"
npm start
