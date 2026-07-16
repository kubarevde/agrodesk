#!/usr/bin/env python3
"""Print which env keys are visible inside the container (no secret values)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BOT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BOT_ROOT))

from dotenv import load_dotenv

for path in ('.env', 'bot.env', 'bothost.env', '/app/.env', '/app/bot.env', '/app/bothost.env'):
    load_dotenv(path)

interesting = ('BOT', 'API', 'AGRO', 'TOKEN', 'SECRET', 'URL', 'DOMAIN', 'TEMPLATE')
print('=== AgroDesk bot env debug ===')
print(f'cwd={os.getcwd()}')
print()

for key in sorted(os.environ):
    if any(part in key.upper() for part in interesting):
        print(f'  {key}=<set len={len(os.environ[key])}>')

print()
required = ('BOT_TOKEN', 'API_BASE_URL', 'BOT_INTERNAL_SECRET')
for name in required:
    val = (os.environ.get(name) or '').strip()
    status = 'OK' if val else 'MISSING'
    print(f'  {name}: {status}')

files = ['.env', 'bot.env', 'bothost.env', '/app/.env', '/app/bot.env', '/app/bothost.env']
print()
print('Env files on disk:')
for f in files:
    p = Path(f)
    print(f'  {f}: {"exists" if p.is_file() else "not found"}')
