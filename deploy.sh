#!/usr/bin/env bash
# Deploy / update AgroDesk on the VPS.
#
# Usage (from repo root on the server):
#   chmod +x deploy.sh scripts/*.sh
#   cp .env.production.example .env.production   # first time only
#   ./deploy.sh
#
# Requires: Docker, Docker Compose plugin, .env.production
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE — copy from .env.production.example" >&2
  exit 1
fi

echo "==> git pull"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || git pull
else
  echo "WARN: not a git checkout — skip pull"
fi

echo "==> build images"
docker compose -f docker-compose.yml --env-file "$ENV_FILE" build

echo "==> recreate containers (volumes preserved — no -v)"
docker compose -f docker-compose.yml --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> wait for API health"
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 3
  if [[ "$i" -eq 40 ]]; then
    echo "ERROR: API did not become healthy" >&2
    docker compose --env-file "$ENV_FILE" logs --tail=80 api
    exit 1
  fi
done

echo "==> alembic current"
docker exec agrodesk_api alembic current || true

echo "==> prune dangling images"
docker image prune -f >/dev/null || true

echo "Deployed successfully at $(date -Is 2>/dev/null || date)"
echo "Frontend: http://213.183.104.142:3010"
echo "Health:   http://213.183.104.142:3010/api/health"
