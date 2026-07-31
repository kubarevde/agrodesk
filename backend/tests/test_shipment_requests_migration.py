"""Upgrade / downgrade smoke for shipment_requests migration (030)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings

PREV_REVISION = '029_support_attach_tmpls'
TABLES = ('shipment_requests', 'shipment_request_attachments')
EXPECTED_INDEXES = {
    'shipment_requests': {
        'ix_shipment_requests_org_status_planned',
        'ix_shipment_requests_org_item',
    },
    'shipment_request_attachments': {
        'ix_shipment_request_attachments_org_id',
        'ix_shipment_request_attachments_request_id',
    },
}
REQUIRED_REQUEST_COLUMNS = {
    'org_id',
    'inventory_item_id',
    'customer_name',
    'quantity',
    'price',
    'planned_at',
    'priority',
    'status',
    'created_by',
    'assigned_to',
    'completed_at',
    'shift_id',
    'created_at',
    'updated_at',
}


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
        indexes: dict[str, set[str]] = {}
        columns: dict[str, set[str]] = {}
        for table in TABLES:
            if table in tables:
                indexes[table] = {idx['name'] for idx in insp.get_indexes(table)}
                columns[table] = {c['name'] for c in insp.get_columns(table)}
        inv_ops = (
            {c['name'] for c in insp.get_columns('inventory_operations')}
            if 'inventory_operations' in tables
            else set()
        )
        rev = sync_conn.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
        return {
            'tables': tables,
            'indexes': indexes,
            'columns': columns,
            'inventory_operations_columns': inv_ops,
            'revision': rev,
        }

    try:
        async with engine.connect() as conn:
            return await conn.run_sync(collect)
    finally:
        await engine.dispose()


def test_shipment_requests_migration_upgrade_downgrade():
    """Downgrade 030 → 029 then upgrade to head; inventory schema untouched."""
    cfg = _alembic_config()

    command.upgrade(cfg, 'head')
    after_head = asyncio.run(_schema_snapshot())
    for table in TABLES:
        assert table in after_head['tables'], f'{table} missing after upgrade head'
    for table, indexes in EXPECTED_INDEXES.items():
        present = after_head['indexes'].get(table, set())
        assert indexes.issubset(present), f'{table} indexes missing: {indexes - present}'
    assert REQUIRED_REQUEST_COLUMNS.issubset(after_head['columns']['shipment_requests'])

    inv_cols_head = after_head['inventory_operations_columns']
    assert inv_cols_head, 'inventory_operations must exist'
    # Columns added after 030 (harvest unify 037+) are expected to disappear at 029.
    later_inventory_ops_columns = {'field_id'}
    inv_cols_at_029 = inv_cols_head - later_inventory_ops_columns

    command.downgrade(cfg, PREV_REVISION)
    after_down = asyncio.run(_schema_snapshot())
    for table in TABLES:
        assert table not in after_down['tables'], f'{table} still present after downgrade'
    assert after_down['inventory_operations_columns'] == inv_cols_at_029
    assert after_down['revision'] == PREV_REVISION

    command.upgrade(cfg, 'head')
    after_up = asyncio.run(_schema_snapshot())
    for table in TABLES:
        assert table in after_up['tables']
    assert after_up['inventory_operations_columns'] == inv_cols_head

    final = asyncio.run(_schema_snapshot())
    assert 'shipment_requests' in final['tables']
    # inventory_operation_id added in 031 — present at head
    assert 'inventory_operation_id' in final['columns']['shipment_requests']
    assert 'field_id' in final['inventory_operations_columns']
