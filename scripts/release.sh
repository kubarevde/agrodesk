#!/usr/bin/env bash
# Recommended VPS release path: preflight → optional backup → deploy.sh → postflight → smoke.
# Keeps ./deploy.sh as the build/migrate entrypoint; this script only orchestrates safety.
#
# Usage (repo root on VPS):
#   ./scripts/release.sh
#   WITH_BACKUP=1 ./scripts/release.sh          # DB + uploads before deploy
#   REQUIRE_BACKUP=1 ./scripts/release.sh       # fail if no fresh dump
#   SKIP_SMOKE=1 ./scripts/release.sh
#   DRY_RUN=1 ./scripts/release.sh              # preflight only (no deploy)
#
# Rollback is NOT automatic — see ./scripts/rollback_hint.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_BACKUP="${WITH_BACKUP:-0}"
REQUIRE_BACKUP="${REQUIRE_BACKUP:-0}"
SKIP_SMOKE="${SKIP_SMOKE:-0}"
DRY_RUN="${DRY_RUN:-0}"

chmod +x "$ROOT/deploy.sh" "$ROOT/scripts/"*.sh 2>/dev/null || true

echo "==> 1/5 preflight"
REQUIRE_BACKUP="$REQUIRE_BACKUP" DRY_RUN="$DRY_RUN" \
  bash "$ROOT/scripts/preflight_release.sh"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN complete — no deploy"
  exit 0
fi

if [[ "$WITH_BACKUP" == "1" ]]; then
  echo "==> 2/5 backup DB + uploads"
  bash "$ROOT/scripts/backup_db.sh"
  bash "$ROOT/scripts/backup_uploads.sh"
else
  echo "==> 2/5 backup skipped (set WITH_BACKUP=1 for DB+uploads)"
fi

echo "==> 3/5 deploy.sh"
# Avoid double-backup inside deploy when we already backed up
WITH_BACKUP=0 bash "$ROOT/deploy.sh"

echo "==> 4/5 postflight"
bash "$ROOT/scripts/postflight_release.sh"

if [[ "$SKIP_SMOKE" == "1" ]]; then
  echo "==> 5/5 smoke skipped"
  bash "$ROOT/scripts/release_smoke.sh" --checklist-only
else
  echo "==> 5/5 smoke"
  bash "$ROOT/scripts/release_smoke.sh"
fi

echo "Release orchestration finished at $(date -Is 2>/dev/null || date)"
echo "If something is wrong: ./scripts/rollback_hint.sh"
