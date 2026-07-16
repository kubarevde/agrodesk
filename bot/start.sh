#!/bin/sh
# Load env files (bothost panel vars + optional files in repo) then start bot.
set -a
for f in /app/.env /app/bot.env /app/bothost.env; do
  if [ -f "$f" ]; then
    echo "[agrodesk-bot] loading $f"
    # shellcheck disable=SC1090
    . "$f"
  fi
done
set +a
exec python bot.py
