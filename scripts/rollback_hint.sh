#!/usr/bin/env bash
# Honest rollback guidance — NO automatic alembic downgrade, NO silent restore.
#
# Usage:
#   ./scripts/rollback_hint.sh
#   ./scripts/rollback_hint.sh backups/agrodesk_YYYYMMDD_HHMMSS.sql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
SUGGESTED="${1:-}"

cat <<EOF
======== AgroDesk rollback (manual) ========

Philosophy: restore from backup beats blind alembic downgrade.
deploy.sh never auto-rolls back. Do not run alembic downgrade on prod
unless you have a tested plan on a copy of the DB.

1) Find dumps
   ls -lth ${BACKUP_DIR}/agrodesk_*.sql | head
   ls -lth ${BACKUP_DIR}/uploads_*.tar.gz | head

2) Restore DB (DESTRUCTIVE — requires typing YES)
   ./scripts/restore_db.sh ${SUGGESTED:-backups/agrodesk_YYYYMMDD_HHMMSS.sql}
   # or gzip harvest dump:
   # ./scripts/restore_db_from_backup.sh backups/backup_harvest_unify_….sql.gz

3) Restore uploads (if photos matter)
   ./scripts/restore_uploads.sh backups/uploads_YYYYMMDD_HHMMSS.tar.gz

4) Align running code with restored schema
   - Prefer redeploy the git revision that matched the dump, then:
     docker compose --env-file .env.production up -d api nginx
   - Or carefully alembic upgrade head only if schema must move forward.

5) Verify
   ./scripts/postflight_release.sh
   ./scripts/release_smoke.sh

Never: docker compose down -v on prod.
============================================
EOF

if [[ -n "$SUGGESTED" && -f "$SUGGESTED" ]]; then
  echo "OK: dump exists: $SUGGESTED ($(du -h "$SUGGESTED" | cut -f1))"
elif [[ -n "$SUGGESTED" ]]; then
  echo "WARN: file not found: $SUGGESTED" >&2
  exit 1
fi
