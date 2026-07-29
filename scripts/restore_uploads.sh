#!/usr/bin/env bash
# Restore uploads volume from an archive created by scripts/backup_uploads.sh.
#
# Usage:
#   ./scripts/restore_uploads.sh                       # latest uploads_*.tar.gz
#   ./scripts/restore_uploads.sh /path/to/uploads_….tar.gz
#
# WARNING: replaces current files under /app/uploads in the API container.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${API_CONTAINER:-agrodesk_api}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
UPLOADS_IN_CONTAINER="${UPLOADS_IN_CONTAINER:-/app/uploads}"

if [[ $# -ge 1 ]]; then
  ARCHIVE="$1"
else
  ARCHIVE="$(ls -t "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null | head -1 || true)"
fi

if [[ -z "${ARCHIVE}" || ! -f "${ARCHIVE}" ]]; then
  echo "ERROR: archive not found. Pass a path or create backups/ first." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

echo "About to restore uploads:"
echo "  container=$CONTAINER path=$UPLOADS_IN_CONTAINER"
echo "  archive=$ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
read -r -p "Type YES to continue: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> clear $UPLOADS_IN_CONTAINER"
docker exec "$CONTAINER" sh -c "find '$UPLOADS_IN_CONTAINER' -mindepth 1 -delete"

echo "==> extract archive"
docker exec -i "$CONTAINER" tar -C "$UPLOADS_IN_CONTAINER" -xzf - < "$ARCHIVE"

echo "==> result"
docker exec "$CONTAINER" du -sh "$UPLOADS_IN_CONTAINER"
echo "Restore finished. If images 404 in UI, restart api: docker compose --env-file .env.production restart api"
