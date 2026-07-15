#!/usr/bin/env bash
# Restore PostgreSQL from a dump created by scripts/backup_db.sh.
#
# Usage:
#   ./scripts/restore_db.sh                  # latest dump in ./backups
#   ./scripts/restore_db.sh /path/to/file.sql
#
# WARNING: replaces current DB contents. Confirm before running on production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

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

if [[ $# -ge 1 ]]; then
  DUMP="$1"
else
  DUMP="$(ls -t "${BACKUP_DIR}"/agrodesk_*.sql 2>/dev/null | head -1 || true)"
fi

if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "ERROR: dump file not found. Pass a path or create backups/ first." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

echo "About to restore:"
echo "  container=$CONTAINER db=$PGDATABASE"
echo "  dump=$DUMP"
read -r -p "Type YES to continue: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> restore into $PGDATABASE"
docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" < "$DUMP"
echo "Restore finished."
