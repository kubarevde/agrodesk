#!/usr/bin/env bash
# PostgreSQL dump with 14-day rotation.
#
# Usage (on the VPS, from project root):
#   chmod +x scripts/backup_db.sh
#   ./scripts/backup_db.sh
#
# Cron (daily 03:15):
#   15 3 * * * cd /opt/agrodesk && ./scripts/backup_db.sh >> /var/log/agrodesk-backup.log 2>&1
#
# Env overrides:
#   BACKUP_DIR=/backups POSTGRES_USER=agrodesk POSTGRES_DB=agrodesk ./scripts/backup_db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load production passwords if present
if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

CONTAINER="${POSTGRES_CONTAINER:-agrodesk_db}"
PGUSER="${POSTGRES_USER:-agrodesk}"
PGDATABASE="${POSTGRES_DB:-agrodesk}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/agrodesk_${STAMP}.sql"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

echo "==> pg_dump $PGDATABASE from $CONTAINER → $FILE"
docker exec -t "$CONTAINER" pg_dump -U "$PGUSER" "$PGDATABASE" > "$FILE"
echo "Wrote $FILE ($(du -h "$FILE" | cut -f1))"

echo "==> rotate backups older than ${KEEP_DAYS} days"
find "$BACKUP_DIR" -name 'agrodesk_*.sql' -mtime +"$KEEP_DAYS" -delete
ls -lh "$BACKUP_DIR" | tail -n 20
