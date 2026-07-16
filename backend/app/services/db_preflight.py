"""Warn when PostgreSQL alembic revision is behind code head."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _backend_root() -> Path:
    # .../backend/app/services/db_preflight.py → backend/
    return Path(__file__).resolve().parents[2]


def _alembic_heads() -> set[str]:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    ini = _backend_root() / 'alembic.ini'
    cfg = Config(str(ini))
    cfg.set_main_option('script_location', str(_backend_root() / 'alembic'))
    script = ScriptDirectory.from_config(cfg)
    return set(script.get_heads())


async def check_db_revision(engine: AsyncEngine) -> dict[str, str | bool | None]:
    """Compare DB alembic_version with code heads. Never raises."""
    heads = _alembic_heads()
    head = next(iter(heads)) if len(heads) == 1 else ','.join(sorted(heads))

    current: str | None = None
    try:
        async with engine.connect() as conn:

            def _current(sync_conn):  # type: ignore[no-untyped-def]
                from alembic.runtime.migration import MigrationContext

                ctx = MigrationContext.configure(sync_conn)
                return ctx.get_current_revision()

            current = await conn.run_sync(_current)
    except Exception as exc:  # noqa: BLE001 — preflight must not crash API
        logger.error(
            'DB preflight failed: cannot read alembic_version (%s). '
            'Run: cd backend && alembic upgrade head && python -m app.seed',
            exc,
        )
        return {
            'db_revision': None,
            'code_head': head,
            'db_up_to_date': False,
            'error': str(exc),
        }

    up_to_date = current is not None and current in heads
    if not up_to_date:
        logger.error(
            'DB schema is behind code. current=%s head=%s. '
            'Run: cd backend && alembic upgrade head && python -m app.seed '
            'then restart uvicorn (old process may still miss /api/dictionaries).',
            current,
            head,
        )
    else:
        logger.info('DB schema OK (revision %s)', current)

    return {
        'db_revision': current,
        'code_head': head,
        'db_up_to_date': up_to_date,
    }
