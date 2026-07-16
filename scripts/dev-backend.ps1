# Predictable local backend bring-up: migrate → seed → uvicorn
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root 'backend')

Write-Host '==> alembic upgrade head'
alembic upgrade head
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '==> python -m app.seed (idempotent)'
python -m app.seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '==> uvicorn (reload). Stop with Ctrl+C'
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
