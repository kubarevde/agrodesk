"""Seed QA database using DATABASE_URL from _qa_database_url.txt."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
url = (ROOT / "_qa_database_url.txt").read_text(encoding="utf-8").strip()
env = os.environ.copy()
env["DATABASE_URL"] = url
env["RUN_SEED_ON_START"] = "false"
print("seeding", url.split("@")[-1])
r = subprocess.run([sys.executable, "-m", "app.seed"], cwd=BACKEND, env=env)
raise SystemExit(r.returncode)
