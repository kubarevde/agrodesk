#!/usr/bin/env bash
# Smoke: alembic upgrade head → downgrade -1 → upgrade head on current DATABASE_URL / API container.
# Use on a COPY of prod/staging, never as the only safety net (always take a dump first).
#
# Usage (repo root or backend/):
#   ./scripts/alembic_migration_smoke.sh
#   ./scripts/alembic_migration_smoke.sh 2   # downgrade N steps then upgrade
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STEPS="${1:-1}"
cd "$ROOT/backend"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx agrodesk_api; then
  run() { docker exec agrodesk_api alembic "$@"; }
  echo "==> using docker exec agrodesk_api"
else
  run() { python -m alembic "$@"; }
  echo "==> using local python -m alembic (cwd=backend)"
fi

echo "==> current"
run current
echo "==> upgrade head"
run upgrade head
echo "==> downgrade -$STEPS"
run downgrade "-$STEPS"
echo "==> upgrade head (again)"
run upgrade head
echo "==> current (final)"
run current
echo "OK: upgrade/downgrade/upgrade completed for $STEPS step(s)"
