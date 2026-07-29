#!/usr/bin/env bash
# Install daily cron for DB + uploads backup (03:15).
# Run once on the VPS as root or a user that can docker + write the log:
#   sudo ./scripts/install_backup_cron.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# agrodesk-nightly-backup"
CRON_LINE="15 3 * * * ${ROOT}/scripts/run_nightly_backup.sh ${MARKER}"

chmod +x \
  "${ROOT}/scripts/backup_db.sh" \
  "${ROOT}/scripts/backup_uploads.sh" \
  "${ROOT}/scripts/restore_uploads.sh" \
  "${ROOT}/scripts/sync_backups_offsite.sh" \
  "${ROOT}/scripts/run_nightly_backup.sh" \
  "${ROOT}/scripts/install_backup_cron.sh"

touch /var/log/agrodesk-backup.log 2>/dev/null || {
  echo "WARN: cannot write /var/log/agrodesk-backup.log — set BACKUP_LOG in crontab if needed" >&2
}

EXISTING="$(crontab -l 2>/dev/null || true)"
if echo "$EXISTING" | grep -Fq "$MARKER"; then
  echo "Cron already installed:"
  echo "$EXISTING" | grep -F "$MARKER"
  exit 0
fi

{
  echo "$EXISTING"
  echo "$CRON_LINE"
} | grep -v '^$' | crontab -

echo "Installed cron:"
crontab -l | grep -F "$MARKER"
echo "Log: /var/log/agrodesk-backup.log"
echo "Optional offsite: export BACKUP_OFFSITE_TARGET=… in crontab or .env.production (sourced by backup_db)."
