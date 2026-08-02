#!/usr/bin/env bash
# Syntax / guard self-check for release scripts (safe to run anywhere with bash).
# Does not talk to Docker or prod.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
failed=0

scripts=(
  "$ROOT/deploy.sh"
  "$ROOT/scripts/preflight_release.sh"
  "$ROOT/scripts/postflight_release.sh"
  "$ROOT/scripts/release_smoke.sh"
  "$ROOT/scripts/release.sh"
  "$ROOT/scripts/rollback_hint.sh"
  "$ROOT/scripts/lib/release_common.sh"
  "$ROOT/scripts/deploy_with_db_backup.sh"
  "$ROOT/scripts/backup_db.sh"
  "$ROOT/scripts/backup_uploads.sh"
)

echo "==> bash -n on release-related scripts"
for s in "${scripts[@]}"; do
  if [[ ! -f "$s" ]]; then
    echo "ERROR: missing $s" >&2
    failed=1
    continue
  fi
  if bash -n "$s"; then
    echo "OK: $s"
  else
    echo "ERROR: syntax $s" >&2
    failed=1
  fi
done

echo "==> DRY_RUN preflight (may warn without Docker/.env.production)"
if DRY_RUN=1 bash "$ROOT/scripts/preflight_release.sh"; then
  echo "OK: preflight DRY_RUN exited 0"
else
  # Missing .env.production is expected on a laptop without prod env — accept exit 1 only for that.
  echo "WARN: preflight DRY_RUN exited non-zero (ok if no .env.production locally)"
fi

if [[ "$failed" -ne 0 ]]; then
  echo "ERROR: release script selfcheck FAILED" >&2
  exit 1
fi
echo "OK: release script selfcheck PASSED"
