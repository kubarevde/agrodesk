#!/usr/bin/env bash
# Deploy wrapper: mandatory harvest-unify DB backup, then standard deploy.sh.
#
# Usage (VPS, repo root):
#   ./scripts/deploy_with_db_backup.sh
#
# Skips backup only if SKIP_DB_BACKUP=1 (not recommended for harvest releases).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_DB_BACKUP:-0}" != "1" ]]; then
  echo "==> pre-deploy DB backup (harvest-unify)"
  bash "$ROOT/scripts/backup_db_harvest_unify.sh"
else
  echo "WARN: SKIP_DB_BACKUP=1 — no dump taken"
fi

FROM_REV="unknown"
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx agrodesk_api; then
  FROM_REV="$(docker exec agrodesk_api alembic current 2>/dev/null | tr '\n' ' ' || true)"
fi
echo "==> alembic before deploy: $FROM_REV"
echo "==> git HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

bash "$ROOT/deploy.sh"

echo "==> alembic after deploy:"
docker exec agrodesk_api alembic current || true

if [[ "${SKIP_POSTFLIGHT:-0}" != "1" && -f "$ROOT/scripts/postflight_release.sh" ]]; then
  echo "==> postflight"
  bash "$ROOT/scripts/postflight_release.sh"
fi

echo "Deploy+backup wrapper finished at $(date -Is 2>/dev/null || date)"
echo "Next: ./scripts/release_smoke.sh"
