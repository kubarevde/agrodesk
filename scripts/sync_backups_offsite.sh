#!/usr/bin/env bash
# Optional: copy local backup dir to a second disk or remote host (rsync/SSH).
# Skips quietly if BACKUP_OFFSITE_TARGET is unset — safe to call from cron always.
#
# Examples:
#   BACKUP_OFFSITE_TARGET=/mnt/usb-backups/agrodesk ./scripts/sync_backups_offsite.sh
#   BACKUP_OFFSITE_TARGET=backup@192.168.1.50:/var/backups/agrodesk ./scripts/sync_backups_offsite.sh
#
# Env:
#   BACKUP_DIR              — source (default: <repo>/backups)
#   BACKUP_OFFSITE_TARGET   — destination path or user@host:/path
#   RSYNC_RSH               — optional, e.g. "ssh -i /root/.ssh/backup_key"
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "${ROOT}/.env.production" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env.production"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
TARGET="${BACKUP_OFFSITE_TARGET:-}"

if [[ -z "$TARGET" ]]; then
  echo "==> offsite sync skipped (set BACKUP_OFFSITE_TARGET to enable)"
  exit 0
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: BACKUP_DIR missing: $BACKUP_DIR" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "ERROR: rsync not installed (apt install rsync)" >&2
  exit 1
fi

RSYNC_OPTS=(-a --delete --human-readable)
if [[ -n "${RSYNC_RSH:-}" ]]; then
  RSYNC_OPTS+=(-e "$RSYNC_RSH")
fi

echo "==> rsync $BACKUP_DIR/ → $TARGET/"
# trailing slash: sync contents of backups/
rsync "${RSYNC_OPTS[@]}" "${BACKUP_DIR}/" "${TARGET}/"
echo "Offsite sync done."
