#!/usr/bin/env bash
# Shared helpers for AgroDesk release scripts (VPS / Compose).
# shellcheck shell=bash
# Usage: source from other scripts after setting ROOT.

set -euo pipefail

: "${ROOT:?ROOT must be set before sourcing release_common.sh}"

ENV_FILE="${ENV_FILE:-${ROOT}/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT}/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
API_CONTAINER="${API_CONTAINER:-agrodesk_api}"
DB_CONTAINER="${POSTGRES_CONTAINER:-agrodesk_db}"
NGINX_CONTAINER="${NGINX_CONTAINER:-agrodesk_nginx}"

# Local API (direct) and public UI proxy health URLs
HEALTH_DIRECT="${HEALTH_DIRECT:-http://127.0.0.1:8000/health}"
HEALTH_PUBLIC="${HEALTH_PUBLIC:-http://127.0.0.1:3010/api/health}"

# Backup considered "fresh" if younger than this (minutes)
MAX_BACKUP_AGE_MINUTES="${MAX_BACKUP_AGE_MINUTES:-180}"

# Status lines go to stderr so command substitution never pollutes JSON bodies.
log() { printf '%s\n' "$*" >&2; }
err() { printf 'ERROR: %s\n' "$*" >&2; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
ok() { printf 'OK: %s\n' "$*" >&2; }

die() {
  err "$*"
  exit 1
}

require_cmd() {
  local c
  for c in "$@"; do
    if ! command -v "$c" >/dev/null 2>&1; then
      if [[ "${DRY_RUN:-0}" == "1" ]]; then
        warn "required command not found (DRY_RUN): $c"
      else
        die "required command not found: $c"
      fi
    fi
  done
}

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

container_running() {
  local name="$1"
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$name"
}

curl_json() {
  local url="$1"
  curl -sf --max-time 15 "$url"
}

# Prefer first {...} object if the string has a human prefix (defensive).
_health_json_slice() {
  python3 -c '
import sys
raw = sys.stdin.read()
start, end = raw.find("{"), raw.rfind("}")
sys.stdout.write(raw[start : end + 1] if start >= 0 and end > start else raw)
'
}

# Returns 0 if JSON has "db_up_to_date": true (tolerant of spacing).
health_db_up_to_date() {
  local json="$1"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$json" | _health_json_slice | python3 -c '
import json,sys
d=json.load(sys.stdin)
sys.exit(0 if d.get("db_up_to_date") is True else 1)
' 2>/dev/null
    return $?
  fi
  printf '%s' "$json" | grep -Eq '"db_up_to_date"[[:space:]]*:[[:space:]]*true'
}

health_field() {
  local json="$1" field="$2"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$json" | _health_json_slice | python3 -c '
import json,sys
d=json.load(sys.stdin)
v=d.get(sys.argv[1])
print("" if v is None else v)
' "$field" 2>/dev/null || true
    return 0
  fi
  printf '%s' "$json" | sed -n "s/.*\"${field}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

# Newest agrodesk_*.sql or uploads_*.tar.gz age in minutes; empty if none.
newest_backup_age_minutes() {
  local pattern="$1"
  local newest
  newest="$(ls -1t "${BACKUP_DIR}"/${pattern} 2>/dev/null | head -n1 || true)"
  if [[ -z "$newest" || ! -f "$newest" ]]; then
    echo ""
    return 0
  fi
  local now mtime age
  now="$(date +%s)"
  if stat -c %Y "$newest" >/dev/null 2>&1; then
    mtime="$(stat -c %Y "$newest")"
  else
    mtime="$(stat -f %m "$newest" 2>/dev/null || echo 0)"
  fi
  age=$(( (now - mtime) / 60 ))
  echo "$age"
}

assert_recent_backups() {
  local db_age up_age
  db_age="$(newest_backup_age_minutes 'agrodesk_*.sql')"
  up_age="$(newest_backup_age_minutes 'uploads_*.tar.gz')"
  if [[ -z "$db_age" ]]; then
    die "no DB dump in ${BACKUP_DIR}/agrodesk_*.sql — run ./scripts/backup_db.sh first (or WITH_BACKUP=1)"
  fi
  if [[ "$db_age" -gt "$MAX_BACKUP_AGE_MINUTES" ]]; then
    die "newest DB backup is ${db_age} min old (limit ${MAX_BACKUP_AGE_MINUTES}). Run ./scripts/backup_db.sh or WITH_BACKUP=1"
  fi
  ok "DB backup age ${db_age} min"
  if [[ -z "$up_age" ]]; then
    warn "no uploads_*.tar.gz found — photos may be at risk (run ./scripts/backup_uploads.sh)"
  elif [[ "$up_age" -gt "$MAX_BACKUP_AGE_MINUTES" ]]; then
    warn "uploads backup is ${up_age} min old (limit ${MAX_BACKUP_AGE_MINUTES})"
  else
    ok "uploads backup age ${up_age} min"
  fi
}
