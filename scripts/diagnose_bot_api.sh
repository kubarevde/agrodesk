#!/usr/bin/env bash
# AgroDesk — диагностика связи bot ↔ api (запускать на VPS из /opt/agrodesk).
# Usage: ./scripts/diagnose_bot_api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Compose status ==="
docker compose --env-file .env.production ps || docker compose ps

echo
echo "=== 2. Public / nginx health ==="
curl -sfS -m 5 "http://127.0.0.1:3010/api/health" | tee /tmp/agrodesk_health.json || echo "FAIL nginx→api"
echo

echo
echo "=== 3. API direct health ==="
curl -sfS -m 5 "http://127.0.0.1:8000/api/health" || echo "FAIL api:8000"
echo

echo
echo "=== 4. Bot → API (Docker network) ==="
if docker compose --env-file .env.production ps bot 2>/dev/null | grep -q Up \
  || docker ps --filter name=agrodesk_bot --format '{{.Status}}' | grep -qi up; then
  echo "API_BASE_URL inside bot:"
  docker exec agrodesk_bot printenv API_BASE_URL || true
  echo "BOT_INTERNAL_SECRET set? (length only)"
  docker exec agrodesk_bot sh -c 'echo ${#BOT_INTERNAL_SECRET}'
  echo "curl http://api:8000/api/health from bot:"
  docker exec agrodesk_bot curl -sfS -m 5 "http://api:8000/api/health" \
    || docker exec agrodesk_bot python -c "import urllib.request; print(urllib.request.urlopen('http://api:8000/api/health', timeout=5).read().decode())"
else
  echo "Container agrodesk_bot is NOT running."
  echo "If bot is on bothost.ru — check API_BASE_URL=http://213.183.104.142:3010 (NOT http://api:8000)."
fi

echo
echo "=== 5. Recent bot logs ==="
docker logs --tail=80 agrodesk_bot 2>&1 || echo "(no bot container)"

echo
echo "=== 6. Recent api logs (bot-token / shifts) ==="
docker logs --tail=120 agrodesk_api 2>&1 | grep -E 'bot-token|/api/shifts|403|500|ERROR' || echo "(no matching lines in last 120)"

echo
echo "=== 7. Dual polling check ==="
echo "Count containers/processes with BOT_TOKEN polling — only ONE should exist (VPS xor bothost)."
docker ps --format '{{.Names}}' | grep -i bot || true

echo
echo "Done. See docs/bot-api-diagnostics.md"
