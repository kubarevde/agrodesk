#!/usr/bin/env bash
# Deploy / update AgroDesk on the VPS.
#
# Usage (from repo root on the server):
#   chmod +x deploy.sh scripts/*.sh
#   cp .env.production.example .env.production   # first time only
#   ./deploy.sh
#
# Optional env:
#   WITH_BACKUP=1       — run backup_db + backup_uploads before git pull
#   REQUIRE_BACKUP=1    — fail if no fresh agrodesk_*.sql (see MAX_BACKUP_AGE_MINUTES)
#   SKIP_POSTFLIGHT=1   — skip scripts/postflight_release.sh at the end (not recommended)
#
# Preferred full path (preflight + backup + this + smoke):
#   WITH_BACKUP=1 ./scripts/release.sh
#
# Requires: Docker, Docker Compose plugin, .env.production
# Does NOT auto-rollback. On failure see: ./scripts/rollback_hint.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
WITH_BACKUP="${WITH_BACKUP:-0}"
REQUIRE_BACKUP="${REQUIRE_BACKUP:-0}"
SKIP_POSTFLIGHT="${SKIP_POSTFLIGHT:-0}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE — copy from .env.production.example" >&2
  exit 1
fi

if [[ "$REQUIRE_BACKUP" == "1" || "$WITH_BACKUP" == "1" ]]; then
  # shellcheck source=scripts/lib/release_common.sh
  source "$ROOT/scripts/lib/release_common.sh"
fi

if [[ "$REQUIRE_BACKUP" == "1" && "$WITH_BACKUP" != "1" ]]; then
  echo "==> REQUIRE_BACKUP=1 — checking fresh dumps"
  assert_recent_backups
fi

if [[ "$WITH_BACKUP" == "1" ]]; then
  echo "==> WITH_BACKUP=1 — DB + uploads before pull"
  bash "$ROOT/scripts/backup_db.sh"
  bash "$ROOT/scripts/backup_uploads.sh"
fi

echo "==> git pull"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || git pull
else
  echo "WARN: not a git checkout — skip pull"
fi

echo "==> build images"
docker compose -f docker-compose.yml --env-file "$ENV_FILE" build

echo "==> recreate containers (volumes preserved — no -v)"
docker compose -f docker-compose.yml --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> wait for API health (direct :8000/health)"
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 3
  if [[ "$i" -eq 40 ]]; then
    echo "ERROR: API did not become healthy" >&2
    docker compose --env-file "$ENV_FILE" logs --tail=80 api
    exit 1
  fi
done

echo "==> alembic upgrade head (required)"
docker exec agrodesk_api alembic upgrade head
echo "==> alembic current"
docker exec agrodesk_api alembic current

echo "==> prune dangling images"
docker image prune -f >/dev/null || true

if [[ "$SKIP_POSTFLIGHT" == "1" ]]; then
  echo "WARN: SKIP_POSTFLIGHT=1 — verify manually: curl -sf http://127.0.0.1:3010/api/health"
  echo "Deployed (postflight skipped) at $(date -Is 2>/dev/null || date)"
else
  echo "==> postflight"
  if [[ -f "$ROOT/scripts/postflight_release.sh" ]]; then
    bash "$ROOT/scripts/postflight_release.sh"
  else
    echo "WARN: postflight script missing — falling back to curl"
    curl -sf http://127.0.0.1:3010/api/health
    echo
  fi
  echo "Deployed successfully at $(date -Is 2>/dev/null || date)"
fi

echo "Frontend: http://213.183.104.142:3010"
echo "Health:   http://213.183.104.142:3010/api/health"
echo "Next:     ./scripts/release_smoke.sh"
echo "Rollback: ./scripts/rollback_hint.sh"
