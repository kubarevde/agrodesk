#!/usr/bin/env bash
# Nightly backups: DB + uploads (+ optional offsite rsync).
# Log: append to /var/log/agrodesk-backup.log (or BACKUP_LOG).
#
# Cron (recommended):
#   15 3 * * * /opt/agrodesk/scripts/run_nightly_backup.sh
#
# Or install via:
#   sudo ./scripts/install_backup_cron.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG="${BACKUP_LOG:-/var/log/agrodesk-backup.log}"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

{
  echo "======== $(date -Is 2>/dev/null || date) nightly backup start ========"
  ./scripts/backup_db.sh
  ./scripts/backup_uploads.sh
  ./scripts/sync_backups_offsite.sh
  echo "======== $(date -Is 2>/dev/null || date) nightly backup ok ========"
} >>"$LOG" 2>&1
