#!/usr/bin/env bash
# Pre-deploy checks for AgroDesk VPS release (fail-fast, no side effects unless noted).
#
# Usage (repo root on VPS):
#   ./scripts/preflight_release.sh
#   DRY_RUN=1 ./scripts/preflight_release.sh
#   REQUIRE_BACKUP=1 ./scripts/preflight_release.sh
#   EXPECT_BRANCH=main ./scripts/preflight_release.sh
#
# Does NOT run deploy or migrations. Optional: WITH_BACKUP is handled by release.sh / deploy.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/release_common.sh
source "$ROOT/scripts/lib/release_common.sh"

DRY_RUN="${DRY_RUN:-0}"
REQUIRE_BACKUP="${REQUIRE_BACKUP:-0}"
EXPECT_BRANCH="${EXPECT_BRANCH:-main}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

log "==> AgroDesk preflight (DRY_RUN=${DRY_RUN})"

require_cmd docker curl
if [[ "${DRY_RUN}" == "1" ]] && ! command -v docker >/dev/null 2>&1; then
  warn "DRY_RUN without docker — skipping compose/container checks"
  log "==> preflight OK (partial DRY_RUN)"
  exit 0
fi
command -v git >/dev/null 2>&1 || warn "git not found — deploy.sh will skip pull"
command -v python3 >/dev/null 2>&1 || warn "python3 not found — health JSON checks use grep fallback"

[[ -f "$ENV_FILE" ]] || die "missing $ENV_FILE — copy from .env.production.example"
[[ -f "$COMPOSE_FILE" ]] || die "missing $COMPOSE_FILE"
ok "env file and compose present"

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose plugin required"
fi
ok "docker compose available"

if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN: would validate compose config"
else
  if ! compose config -q >/dev/null 2>&1; then
    die "docker compose config invalid — fix $ENV_FILE / compose"
  fi
  ok "compose config valid"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  log "git branch: $branch  HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
  if [[ -n "$EXPECT_BRANCH" && "$branch" != "$EXPECT_BRANCH" && "$branch" != "HEAD" ]]; then
    warn "expected branch '$EXPECT_BRANCH', on '$branch' (set EXPECT_BRANCH= or ALLOW)"
  fi
  if [[ "$ALLOW_DIRTY" != "1" ]]; then
    if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
      warn "working tree dirty — prefer clean checkout on VPS (ALLOW_DIRTY=1 to silence)"
    else
      ok "working tree clean"
    fi
  fi
else
  warn "not a git checkout"
fi

for name in "$DB_CONTAINER" "$API_CONTAINER"; do
  if container_running "$name"; then
    ok "container running: $name"
  else
    warn "container not running: $name (first deploy or down — backup_db may fail until db is up)"
  fi
done

if [[ "$REQUIRE_BACKUP" == "1" ]]; then
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN: would require fresh backups (age ≤ ${MAX_BACKUP_AGE_MINUTES} min)"
  else
    assert_recent_backups
  fi
else
  log "tip: set REQUIRE_BACKUP=1 or run ./scripts/backup_db.sh + backup_uploads.sh before risky releases"
  db_age="$(newest_backup_age_minutes 'agrodesk_*.sql')"
  if [[ -n "$db_age" ]]; then
    log "newest DB backup age: ${db_age} min"
  else
    warn "no agrodesk_*.sql in $BACKUP_DIR yet"
  fi
fi

log "==> preflight OK"
log "Next: backup (if needed) → ./deploy.sh → ./scripts/postflight_release.sh → ./scripts/release_smoke.sh"
log "Or one shot: ./scripts/release.sh"
