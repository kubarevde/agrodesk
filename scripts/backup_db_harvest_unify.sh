#!/usr/bin/env bash
# Named full DB dump BEFORE harvest / ТМЦ / shipment-requests schema experiments.
#
# Prefer this wrapper (not plain backup_db.sh) when about to run harvest-unify migrations.
#
# Modes:
#   1) Docker (VPS/prod) — same as scripts/backup_db.sh, special filename prefix.
#   2) Direct DATABASE_URL — local/dev without Docker (pg_dump on PATH).
#
# Usage (repo root):
#   chmod +x scripts/backup_db_harvest_unify.sh
#   ./scripts/backup_db_harvest_unify.sh
#
# Env:
#   BACKUP_DIR, POSTGRES_CONTAINER, POSTGRES_USER, POSTGRES_DB
#   DATABASE_URL (backend/.env or environment) for direct mode
#   FORCE_DIRECT=1 — skip Docker even if container exists
#
# Target: PostgreSQL 16 (project default). pg_dump major version should match server.
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

BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
CONTAINER="${POSTGRES_CONTAINER:-agrodesk_db}"
PGUSER="${POSTGRES_USER:-agrodesk}"
PGDATABASE="${POSTGRES_DB:-agrodesk}"
STAMP="$(date +%Y%m%d_%H%M)"
FILE="${BACKUP_DIR}/backup_harvest_unify_${STAMP}.sql"
mkdir -p "$BACKUP_DIR"

echo "==> harvest-unify baseline backup"
echo "    file: $FILE"
echo "    note: run BEFORE alembic migrations that change harvest/ТМЦ/заявки"
echo "    git tag reference: harvest-unify-baseline (see docs/rollback-harvest-unify.md)"

use_docker=0
if [[ "${FORCE_DIRECT:-0}" != "1" ]] && command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    use_docker=1
  fi
fi

if [[ "$use_docker" -eq 1 ]]; then
  echo "==> mode: docker exec $CONTAINER pg_dump"
  docker exec -t "$CONTAINER" pg_dump -U "$PGUSER" --no-owner --no-acl "$PGDATABASE" > "$FILE"
else
  RAW_URL="${DATABASE_URL:-}"
  if [[ -z "$RAW_URL" ]]; then
    echo "ERROR: no Docker DB container and DATABASE_URL is empty" >&2
    exit 1
  fi
  # Strip SQLAlchemy async driver prefix for libpq tools
  DUMP_URL="${RAW_URL/postgresql+asyncpg:/postgresql:}"
  DUMP_URL="${DUMP_URL/postgres+asyncpg:/postgresql:}"
  echo "==> mode: pg_dump via DATABASE_URL"
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "ERROR: pg_dump not on PATH (install PostgreSQL client tools)" >&2
    exit 1
  fi
  pg_dump --no-owner --no-acl "$DUMP_URL" > "$FILE"
fi

if command -v gzip >/dev/null 2>&1; then
  gzip -f "$FILE"
  FILE="${FILE}.gz"
  echo "Wrote $FILE ($(du -h "$FILE" | cut -f1))"
else
  echo "Wrote $FILE ($(du -h "$FILE" | cut -f1)) — gzip not found, left uncompressed"
fi

# Also write a sibling marker with alembic / git hints (best-effort)
META="${BACKUP_DIR}/backup_harvest_unify_${STAMP}.meta.txt"
{
  echo "created_at=$(date -Is 2>/dev/null || date)"
  echo "file=$(basename "$FILE")"
  echo "git_head=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "git_tag_baseline=harvest-unify-baseline"
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx agrodesk_api; then
    echo "alembic_current=$(docker exec agrodesk_api alembic current 2>/dev/null | tr '\n' ' ' || true)"
  fi
} > "$META" || true

find "$BACKUP_DIR" -name 'backup_harvest_unify_*.sql*' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "==> done. Restore: ./scripts/restore_db_from_backup.sh $FILE"
