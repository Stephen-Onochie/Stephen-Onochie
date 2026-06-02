#!/usr/bin/env bash
# Expose the local proxy over HTTPS with a Cloudflare quick tunnel.
# Run this in a SECOND terminal, after start.sh is already running.
#
# Requires cloudflared:  brew install cloudflared
#
# It prints a public https://<random>.trycloudflare.com URL. Paste that into
# the LG Remote web UI settings as the "Proxy URL". The URL changes each time
# you start a quick tunnel; for a stable URL set up a named tunnel (see README).
set -e
cd "$(dirname "$0")"

PORT="${PORT:-3001}"
if [ -f .env ]; then
  # Pull PORT from .env if present, without exporting everything.
  ENV_PORT="$(grep -E '^PORT=' .env | tail -n1 | cut -d= -f2 | tr -d '[:space:]')"
  if [ -n "$ENV_PORT" ]; then PORT="$ENV_PORT"; fi
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install it with:  brew install cloudflared"
  exit 1
fi

echo "Opening Cloudflare tunnel to http://localhost:${PORT} …"
cloudflared tunnel --url "http://localhost:${PORT}"
