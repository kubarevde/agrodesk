#!/usr/bin/env bash
# Short automated smoke + printed manual checklist after deploy.
# Does NOT replace product QA — only catches "API/UI proxy dead" class of failures.
#
# Usage:
#   ./scripts/release_smoke.sh
#   ./scripts/release_smoke.sh --checklist-only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/release_common.sh
source "$ROOT/scripts/lib/release_common.sh"

CHECKLIST_ONLY=0
if [[ "${1:-}" == "--checklist-only" ]]; then
  CHECKLIST_ONLY=1
fi

print_manual_checklist() {
  cat <<'EOF'

======== Manual smoke (operator) ========
[ ] UI opens: http://213.183.104.142:3010
[ ] Login as manager/admin works
[ ] Employee: Моя смена — start/close (or open shift visible)
[ ] Manager: Дашборд loads without error
[ ] One release-specific path (fields / inventory / reports / …)
[ ] Support: /support opens; guide /support/guide opens
[ ] Telegram bot /start (if this release touched bot or API auth)
[ ] If marketplace enabled: /market catalog loads
=========================================
EOF
}

if [[ "$CHECKLIST_ONLY" == "1" ]]; then
  print_manual_checklist
  exit 0
fi

log "==> AgroDesk release smoke (automated)"
require_cmd curl
failed=0

check_url() {
  local url="$1" label="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" || echo 000)"
  if [[ "$code" == "200" ]]; then
    ok "$label → HTTP $code"
  else
    err "$label → HTTP $code ($url)"
    failed=1
  fi
}

check_url "$HEALTH_DIRECT" "API /health"
check_url "$HEALTH_PUBLIC" "nginx /api/health"
check_url "http://127.0.0.1:3010/" "nginx UI /"

# Public unauthenticated probe (must not 5xx)
mkt_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  http://127.0.0.1:3010/api/public/marketplace/categories || echo 000)"
if [[ "$mkt_code" == "200" || "$mkt_code" == "403" || "$mkt_code" == "404" ]]; then
  ok "marketplace categories probe → HTTP $mkt_code (non-5xx)"
else
  warn "marketplace categories → HTTP $mkt_code (non-blocking)"
fi

orgs_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  http://127.0.0.1:3010/api/auth/orgs || echo 000)"
if [[ "$orgs_code" == "200" ]]; then
  ok "auth/orgs → HTTP 200"
else
  err "auth/orgs → HTTP $orgs_code"
  failed=1
fi

# Re-check db_up_to_date via public health
if body="$(curl_json "$HEALTH_PUBLIC" 2>/dev/null || true)"; then
  if health_db_up_to_date "$body"; then
    ok "health db_up_to_date=true"
  else
    err "health db_up_to_date is not true"
    failed=1
  fi
fi

print_manual_checklist

if [[ "$failed" -ne 0 ]]; then
  err "automated smoke FAILED"
  exit 1
fi

ok "automated smoke PASSED — finish manual checklist above"
