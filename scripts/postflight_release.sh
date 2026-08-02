#!/usr/bin/env bash
# Post-deploy verification: containers + /api/health + db_revision alignment.
#
# Usage (after ./deploy.sh):
#   ./scripts/postflight_release.sh
#   HEALTH_PUBLIC=http://127.0.0.1:3010/api/health ./scripts/postflight_release.sh
#
# Exit 1 if health / containers / db_up_to_date fail — never print "success" on failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/release_common.sh
source "$ROOT/scripts/lib/release_common.sh"

REQUIRE_NGINX="${REQUIRE_NGINX:-1}"
REQUIRE_DB_UP_TO_DATE="${REQUIRE_DB_UP_TO_DATE:-1}"

log "==> AgroDesk postflight"

require_cmd docker curl
[[ -f "$ENV_FILE" ]] || die "missing $ENV_FILE"

failed=0

check_container() {
  local name="$1" required="${2:-1}"
  if container_running "$name"; then
    ok "up: $name"
  else
    if [[ "$required" == "1" ]]; then
      err "container not running: $name"
      failed=1
    else
      warn "container not running (optional): $name"
    fi
  fi
}

check_container "$DB_CONTAINER" 1
check_container "$API_CONTAINER" 1
check_container "$NGINX_CONTAINER" "$REQUIRE_NGINX"
# bot may live on bothost
check_container "${BOT_CONTAINER:-agrodesk_bot}" 0

fetch_health() {
  local url="$1" label="$2"
  local body
  if body="$(curl_json "$url")"; then
    ok "$label reachable"
    printf '%s\n' "$body"
  else
    err "$label failed: $url"
    failed=1
    printf ''
  fi
}

log "==> health direct ($HEALTH_DIRECT)"
direct_json="$(fetch_health "$HEALTH_DIRECT" "direct /health" || true)"

log "==> health public ($HEALTH_PUBLIC)"
public_json="$(fetch_health "$HEALTH_PUBLIC" "public /api/health" || true)"

json="${public_json:-$direct_json}"
if [[ -n "$json" ]]; then
  rev="$(health_field "$json" db_revision)"
  head="$(health_field "$json" code_head)"
  log "db_revision=${rev:-?}  code_head=${head:-?}"
  if health_db_up_to_date "$json"; then
    ok "db_up_to_date=true"
  else
    if [[ "$REQUIRE_DB_UP_TO_DATE" == "1" ]]; then
      err "db_up_to_date is not true — alembic may be behind code_head"
      failed=1
    else
      warn "db_up_to_date is not true"
    fi
  fi
fi

if container_running "$API_CONTAINER"; then
  log "==> alembic current"
  if docker exec "$API_CONTAINER" alembic current; then
    ok "alembic current ok"
  else
    err "alembic current failed"
    failed=1
  fi
fi

log "==> compose ps (summary)"
compose ps || true

if [[ "$failed" -ne 0 ]]; then
  err "postflight FAILED — do not announce release success"
  err "see: docker logs --tail=80 $API_CONTAINER"
  exit 1
fi

ok "postflight PASSED"
log "UI: http://213.183.104.142:3010"
log "Health: http://213.183.104.142:3010/api/health"
