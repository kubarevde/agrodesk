# Harvest-unify DB backup (Windows / local Postgres without Docker).
#
# Usage (repo root, PowerShell):
#   .\scripts\backup_db_harvest_unify.ps1
#
# Requires: pg_dump on PATH, DATABASE_URL in backend\.env or env.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$envFile = Join-Path $Root 'backend\.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $parts = $_.Split('=', 2)
    if ($parts.Length -eq 2 -and -not [string]::IsNullOrWhiteSpace($parts[0])) {
      Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim()
    }
  }
}

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $Root 'backups' }
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$File = Join-Path $BackupDir "backup_harvest_unify_$Stamp.sql"

$RawUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($RawUrl)) {
  throw 'DATABASE_URL is empty (set in backend\.env)'
}
$DumpUrl = $RawUrl -replace 'postgresql\+asyncpg:', 'postgresql:' -replace 'postgres\+asyncpg:', 'postgresql:'

Write-Host "==> pg_dump → $File"
Write-Host "    Run BEFORE harvest/ТМЦ/заявки migrations. Tag: harvest-unify-baseline"
& pg_dump --no-owner --no-acl $DumpUrl -f $File
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed: $LASTEXITCODE" }

$Gz = "$File.gz"
if (Get-Command gzip -ErrorAction SilentlyContinue) {
  & gzip -f $File
  $Out = $Gz
} else {
  # Compress-Archive creates zip; keep .sql and also make .sql.gz via .NET if possible
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $inStream = [System.IO.File]::OpenRead($File)
    $outStream = [System.IO.File]::Create($Gz)
    $gzip = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionMode]::Compress)
    $inStream.CopyTo($gzip)
    $gzip.Dispose(); $outStream.Dispose(); $inStream.Dispose()
    Remove-Item $File
    $Out = $Gz
  } catch {
    $Out = $File
    Write-Host "WARN: could not gzip; left uncompressed"
  }
}

$Meta = Join-Path $BackupDir "backup_harvest_unify_$Stamp.meta.txt"
@(
  "created_at=$(Get-Date -Format o)"
  "file=$(Split-Path -Leaf $Out)"
  "git_head=$(git rev-parse HEAD 2>$null)"
  "git_tag_baseline=harvest-unify-baseline"
) | Set-Content -Encoding utf8 $Meta

Write-Host "Wrote $Out"
Write-Host "Restore (bash/WSL/VPS): ./scripts/restore_db_from_backup.sh $Out"
