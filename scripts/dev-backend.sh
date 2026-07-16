#!/usr/bin/env bash
# Predictable local backend bring-up: migrate → seed → uvicorn
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

echo "==> alembic upgrade head"
alembic upgrade head

echo "==> python -m app.seed (idempotent)"
python -m app.seed

echo "==> uvicorn (reload). Stop with Ctrl+C"
exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
