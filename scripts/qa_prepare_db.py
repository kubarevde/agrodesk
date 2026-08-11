"""Create isolated agrodesk_qa database and run alembic upgrade head."""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import asyncpg

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
QA_DB = "agrodesk_qa"


def load_base_url() -> str:
    raw = (BACKEND / ".env").read_text(encoding="utf-8")
    for line in raw.splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("DATABASE_URL not found in backend/.env")


def to_sync_dsn(url: str, database: str) -> str:
    # postgresql+asyncpg://user:pass@host:port/db -> for asyncpg connect
    cleaned = url.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(cleaned)
    return urlunparse(parsed._replace(path=f"/{database}"))


async def ensure_qa_db(admin_url: str) -> str:
    cleaned = admin_url.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(cleaned)
    # connect to postgres maintenance db
    conn = await asyncpg.connect(
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", QA_DB
        )
        if exists:
            # Drop and recreate for a truly clean DB
            await conn.execute(
                f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{QA_DB}' AND pid <> pg_backend_pid()
                """
            )
            await conn.execute(f'DROP DATABASE IF EXISTS "{QA_DB}"')
        await conn.execute(f'CREATE DATABASE "{QA_DB}"')
        print(f"created database {QA_DB}")
    finally:
        await conn.close()
    return to_sync_dsn(admin_url, QA_DB)


def main() -> None:
    base = load_base_url()
    qa_dsn = asyncio.run(ensure_qa_db(base))
    # alembic uses async URL
    alembic_url = qa_dsn.replace("postgresql://", "postgresql+asyncpg://")
    env = os.environ.copy()
    env["DATABASE_URL"] = alembic_url
    (ROOT / "_qa_database_url.txt").write_text(alembic_url, encoding="utf-8")
    print("running alembic upgrade head …")
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        env=env,
    )
    if r.returncode != 0:
        raise SystemExit(r.returncode)
    print("current revision:")
    subprocess.run(
        [sys.executable, "-m", "alembic", "current"],
        cwd=BACKEND,
        env=env,
        check=False,
    )
    print("heads:")
    subprocess.run(
        [sys.executable, "-m", "alembic", "heads"],
        cwd=BACKEND,
        env=env,
        check=False,
    )


if __name__ == "__main__":
    main()
