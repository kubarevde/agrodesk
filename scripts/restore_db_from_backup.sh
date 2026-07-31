#!/usr/bin/env bash
# Restore PostgreSQL from a harvest-unify (or generic) dump.
#
# Usage (repo root):
#   ./scripts/restore_db_from_backup.sh backups/backup_harvest_unify_YYYYMMDD_HHMM.sql.gz
#   ./scripts/restore_db_from_backup.sh backups/agrodesk_….sql
#
# PROD: run ONLY manually after typing YES. Expect data loss for rows created after the dump.
#
# Sequence:
#   1) Optional stop of API container
#   2) Restore into POSTGRES_DB (destructive)
#   3) Optional start API
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
elif [[ -f backend/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source backend/.env
  set +a
fi

CONTAINER="${POSTGRES_CONTAINER:-agrodesk_db}"
API_CONTAINER="${API_CONTAINER:-agrodesk_api}"
PGUSER="${POSTGRES_USER:-agrodesk}"
PGDATABASE="${POSTGRES_DB:-agrodesk}"
ENV_FILE="${ENV_FILE:-.env.production}"
STOP_API="${STOP_API:-1}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/dump.sql[.gz]" >&2
  exit 1
fi

DUMP="$1"
if [[ ! -f "$DUMP" ]]; then
  echo "ERROR: dump not found: $DUMP" >&2
  exit 1
fi

echo "============================================================"
echo " DESTRUCTIVE RESTORE"
echo " container=$CONTAINER  db=$PGDATABASE"
echo " dump=$DUMP"
echo " Data created AFTER this dump will be LOST."
echo " Prod: confirm with ops lead before continuing."
echo "============================================================"
read -r -p "Type YES to continue: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

use_docker=0
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    use_docker=1
  fi
fi

if [[ "$use_docker" -eq 1 && "$STOP_API" == "1" ]]; then
  if docker ps --format '{{.Names}}' | grep -qx "$API_CONTAINER"; then
    echo "==> stop API ($API_CONTAINER)"
    docker stop "$API_CONTAINER" >/dev/null || true
  fi
fi

stream_dump() {
  case "$DUMP" in
    *.gz) gzip -dc "$DUMP" ;;
    *) cat "$DUMP" ;;
  esac
}

if [[ "$use_docker" -eq 1 ]]; then
  echo "==> restore via docker psql"
  stream_dump | docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1
else
  RAW_URL="${DATABASE_URL:-}"
  if [[ -z "$RAW_URL" ]]; then
    echo "ERROR: Docker DB not running and DATABASE_URL empty" >&2
    exit 1
  fi
  DUMP_URL="${RAW_URL/postgresql+asyncpg:/postgresql:}"
  DUMP_URL="${DUMP_URL/postgres+asyncpg:/postgresql:}"
  if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: psql not on PATH" >&2
    exit 1
  fi
  echo "==> restore via psql DATABASE_URL"
  stream_dump | psql "$DUMP_URL" -v ON_ERROR_STOP=1
fi

echo "==> restore finished"

if [[ "$use_docker" -eq 1 && "$STOP_API" == "1" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    echo "==> start API via docker compose"
    docker compose -f docker-compose.yml --env-file "$ENV_FILE" up -d api >/dev/null || docker start "$API_CONTAINER" >/dev/null || true
  else
    docker start "$API_CONTAINER" >/dev/null || true
  fi
  echo "==> wait for health"
  for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1 || curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
      echo "API healthy"
      break
    fi
    sleep 2
  done
fi

echo "Next: verify alembic current matches restored schema; run smoke tests."
echo "See docs/rollback-harvest-unify.md"
