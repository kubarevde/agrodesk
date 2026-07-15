#!/usr/bin/env bash
# Wrapper: forwards to ./deploy.sh in the repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/deploy.sh" "$@"
