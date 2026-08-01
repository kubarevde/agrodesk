#!/usr/bin/env bash
# Archive Docker uploads volume (/app/uploads) with rotation.
#
# Usage (on the VPS, from project root):
#   chmod +x scripts/backup_uploads.sh
#   ./scripts/backup_uploads.sh
#
# Env overrides:
#   BACKUP_DIR=/backups KEEP_COUNT=14 API_CONTAINER=agrodesk_api ./scripts/backup_uploads.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

CONTAINER="${API_CONTAINER:-agrodesk_api}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
KEEP_COUNT="${KEEP_COUNT:-14}"
UPLOADS_IN_CONTAINER="${UPLOADS_IN_CONTAINER:-/app/uploads}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

if ! docker exec "$CONTAINER" test -d "$UPLOADS_IN_CONTAINER"; then
  echo "ERROR: $UPLOADS_IN_CONTAINER missing in $CONTAINER" >&2
  exit 1
fi

SIZE_BEFORE="$(docker exec "$CONTAINER" du -sh "$UPLOADS_IN_CONTAINER" 2>/dev/null | cut -f1 || echo '?')"
MARKET_SIZE="$(docker exec "$CONTAINER" du -sh "$UPLOADS_IN_CONTAINER/marketplace" 2>/dev/null | cut -f1 || echo '0')"
echo "==> tar.gz $UPLOADS_IN_CONTAINER from $CONTAINER (total ${SIZE_BEFORE}, marketplace ${MARKET_SIZE}) → $FILE"
# Marketplace listings can add many photos (up to 8 per listing, JPEG ≤5MB after Pillow).
# Daily schedule is enough; watch disk: KEEP_COUNT archives × full tree size.
# Prefer BACKUP_OFFSITE_TARGET when marketplace dir grows past a few hundred MB.
docker exec "$CONTAINER" tar -C "$UPLOADS_IN_CONTAINER" -czf - . > "$FILE"
echo "Wrote $FILE ($(du -h "$FILE" | cut -f1))"

echo "==> keep last ${KEEP_COUNT} uploads_*.tar.gz"
mapfile -t OLD < <(ls -1t "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null | tail -n +"$((KEEP_COUNT + 1))" || true)
if ((${#OLD[@]} > 0)); then
  rm -f "${OLD[@]}"
  echo "Removed ${#OLD[@]} old archive(s)"
fi
ls -lh "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n 20 || true
