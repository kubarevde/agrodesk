"""Upgrade / downgrade smoke for org_hierarchy_links (043)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings

PREV_REVISION = '042_tg_id_hygiene'
TABLE = 'org_hierarchy_links'
REQUIRED_COLUMNS = {
    'id',
    'head_org_id',
    'child_org_id',
    'created_at',
    'updated_at',
}
EXPECTED_INDEXES = {
    'ix_org_hierarchy_links_head_org_id',
    # unique(child) is often reported as an index too
    'uq_org_hierarchy_links_child',
}
# Control tables must remain after upgrade/downgrade cycle of 043 only.
CONTROL_TABLES = ('organizations', 'employees', 'market_listings')


def _alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_root / 'alembic.ini'))
    cfg.set_main_option('script_location', str(backend_root / 'alembic'))
    cfg.set_main_option('sqlalchemy.url', settings.DATABASE_URL)
    return cfg


async def _schema_snapshot() -> dict:
    engine = create_async_engine(settings.DATABASE_URL)

    def collect(sync_conn):
        insp = inspect(sync_conn)
        tables = set(insp.get_table_names())
        columns: set[str] = set()
        indexes: set[str] = set()
        uniques: set[str] = set()
        checks: set[str] = set()
        fks: list[dict] = []
        if TABLE in tables:
            columns = {c['name'] for c in insp.get_columns(TABLE)}
            indexes = {idx['name'] for idx in insp.get_indexes(TABLE) if idx['name']}
            uniques = {
                u['name'] for u in insp.get_unique_constraints(TABLE) if u.get('name')
            }
            checks = {
                c['name'] for c in insp.get_check_constraints(TABLE) if c.get('name')
            }
            fks = insp.get_foreign_keys(TABLE)
        rev = sync_conn.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
        return {
            'tables': tables,
            'columns': columns,
            'indexes': indexes,
            'uniques': uniques,
            'checks': checks,
            'fks': fks,
            'revision': rev,
        }

    try:
        async with engine.connect() as conn:
            return await conn.run_sync(collect)
    finally:
        await engine.dispose()


def test_org_hierarchy_links_migration_upgrade_downgrade() -> None:
    cfg = _alembic_config()
    command.upgrade(cfg, 'head')
    after_up = asyncio.run(_schema_snapshot())
    assert after_up['revision'] == '043_org_hierarchy_links'
    assert TABLE in after_up['tables']
    assert REQUIRED_COLUMNS <= after_up['columns']
    assert 'uq_org_hierarchy_links_child' in after_up['uniques']
    assert 'ck_org_hierarchy_links_no_self' in after_up['checks']
    assert 'ix_org_hierarchy_links_head_org_id' in after_up['indexes']
    fk_cols = {tuple(sorted(fk['constrained_columns'])) for fk in after_up['fks']}
    assert ('child_org_id',) in fk_cols
    assert ('head_org_id',) in fk_cols
    for control in CONTROL_TABLES:
        assert control in after_up['tables']

    command.downgrade(cfg, PREV_REVISION)
    after_down = asyncio.run(_schema_snapshot())
    assert after_down['revision'] == PREV_REVISION
    assert TABLE not in after_down['tables']
    for control in CONTROL_TABLES:
        assert control in after_down['tables']

    command.upgrade(cfg, 'head')
    restored = asyncio.run(_schema_snapshot())
    assert restored['revision'] == '043_org_hierarchy_links'
    assert TABLE in restored['tables']
    assert REQUIRED_COLUMNS <= restored['columns']
