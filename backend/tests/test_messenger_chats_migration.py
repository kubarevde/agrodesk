"""Upgrade / downgrade smoke for messenger chats migration (032)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings

PREV_REVISION = '031_shipment_req_op_link'
TABLES = ('chats', 'chat_members', 'chat_messages', 'chat_message_reads')
EXPECTED_INDEXES = {
    'chats': {
        'ix_chats_org_id',
        'ix_chats_org_updated',
    },
    'chat_members': {
        'ix_chat_members_org_chat',
        'ix_chat_members_employee',
        'uq_chat_members_active',
    },
    'chat_messages': {
        'ix_chat_messages_org_chat',
        'ix_chat_messages_chat_created',
    },
    'chat_message_reads': {
        'ix_chat_message_reads_org_chat',
    },
}
REQUIRED_COLUMNS = {
    'chats': {
        'id',
        'org_id',
        'type',
        'name',
        'created_by',
        'created_at',
        'updated_at',
        'archived_at',
    },
    'chat_members': {
        'id',
        'org_id',
        'chat_id',
        'employee_id',
        'role',
        'joined_at',
        'left_at',
    },
    'chat_messages': {
        'id',
        'org_id',
        'chat_id',
        'sender_id',
        'body',
        'attachment_url',
        'created_at',
        'edited_at',
        'deleted_at',
    },
    'chat_message_reads': {
        'chat_id',
        'employee_id',
        'org_id',
        'last_read_message_id',
        'updated_at',
    },
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
        # Untouched control tables from prior features
        support_present = 'support_tickets' in tables
        shipment_present = 'shipment_requests' in tables
        rev = sync_conn.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
        return {
            'tables': tables,
            'indexes': indexes,
            'columns': columns,
            'support_present': support_present,
            'shipment_present': shipment_present,
            'revision': rev,
        }

    try:
        async with engine.connect() as conn:
            return await conn.run_sync(collect)
    finally:
        await engine.dispose()


def test_messenger_chats_migration_upgrade_downgrade():
    """Downgrade past 032 → 031 then upgrade to head; prior schemas untouched.

    Head may be newer than 032 (harvest unify, etc.) — assert messenger tables
    exist at head, disappear at PREV_REVISION, and return after upgrade head.
    """
    cfg = _alembic_config()

    command.upgrade(cfg, 'head')
    after_head = asyncio.run(_schema_snapshot())
    assert after_head['revision'] != PREV_REVISION
    for table in TABLES:
        assert table in after_head['tables'], f'{table} missing after upgrade head'
    for table, indexes in EXPECTED_INDEXES.items():
        present = after_head['indexes'].get(table, set())
        assert indexes.issubset(present), f'{table} indexes missing: {indexes - present}'
    for table, cols in REQUIRED_COLUMNS.items():
        assert cols.issubset(after_head['columns'][table]), (
            f'{table} columns missing: {cols - after_head["columns"][table]}'
        )
    assert after_head['support_present']
    assert after_head['shipment_present']

    command.downgrade(cfg, PREV_REVISION)
    after_down = asyncio.run(_schema_snapshot())
    for table in TABLES:
        assert table not in after_down['tables'], f'{table} still present after downgrade'
    assert after_down['revision'] == PREV_REVISION
    assert after_down['support_present']
    assert after_down['shipment_present']

    command.upgrade(cfg, 'head')
    after_up = asyncio.run(_schema_snapshot())
    for table in TABLES:
        assert table in after_up['tables']
    assert after_up['support_present']
    assert after_up['shipment_present']
    assert after_up['revision'] == after_head['revision']
