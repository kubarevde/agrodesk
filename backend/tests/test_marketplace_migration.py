"""Upgrade / downgrade smoke for marketplace domain migration (039)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings

PREV_REVISION = '038_shipment_cancel_reason'
# Domain tables land in 039; 040 relaxes category_id; 041 adds inventory↔market map.
HEAD_REVISION = '041_mkt_inv_cat_map'
DOMAIN_REVISION = '039_marketplace_domain'
DOMAIN_TABLES = (
    'market_categories',
    'market_seller_profiles',
    'market_listings',
    'market_orders',
    'market_reviews',
)
MAPPING_TABLE = 'market_category_mapping'
TABLES = (*DOMAIN_TABLES, MAPPING_TABLE)
# Warehouse tables must remain untouched by this migration.
CONTROL_TABLES = ('inventory_items', 'shipments', 'organizations')
EXPECTED_INDEXES = {
    'market_listings': {
        'ix_market_listings_status_category',
        'ix_market_listings_org_status',
        'ix_market_listings_title_description_fts',
    },
    'market_orders': {
        'ix_market_orders_listing_id',
        'ix_market_orders_status_created',
    },
}
REQUIRED_COLUMNS = {
    'market_categories': {
        'id',
        'name',
        'slug',
        'parent_id',
        'icon',
        'is_active',
        'sort_order',
    },
    'market_seller_profiles': {
        'id',
        'org_id',
        'display_name',
        'description',
        'logo_url',
        'phone',
        'is_verified',
        'is_active',
        'created_at',
    },
    'market_listings': {
        'id',
        'org_id',
        'seller_profile_id',
        'category_id',
        'title',
        'description',
        'price',
        'unit',
        'quantity_available',
        'photos',
        'status',
        'source_type',
        'source_id',
        'rejection_reason',
        'created_at',
        'updated_at',
        'published_at',
    },
    'market_orders': {
        'id',
        'listing_id',
        'buyer_name',
        'buyer_phone',
        'buyer_comment',
        'quantity',
        'status',
        'created_at',
        'updated_at',
    },
    'market_reviews': {
        'id',
        'org_id',
        'order_id',
        'author_name',
        'rating',
        'comment',
        'is_visible',
        'created_at',
    },
    'market_category_mapping': {
        'id',
        'inventory_category_value',
        'market_category_id',
        'created_at',
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
        control = {name: name in tables for name in CONTROL_TABLES}
        # inventory_items must not gain marketplace columns
        inv_cols = (
            {c['name'] for c in insp.get_columns('inventory_items')}
            if 'inventory_items' in tables
            else set()
        )
        rev = sync_conn.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
        return {
            'tables': tables,
            'indexes': indexes,
            'columns': columns,
            'control': control,
            'inventory_cols': inv_cols,
            'revision': rev,
        }

    try:
        async with engine.connect() as conn:
            return await conn.run_sync(collect)
    finally:
        await engine.dispose()


def test_marketplace_migration_upgrade_downgrade():
    """039+ adds market_* tables; 041 adds mapping; downgrade to 038 removes them."""
    cfg = _alembic_config()

    command.upgrade(cfg, 'head')
    after_head = asyncio.run(_schema_snapshot())
    assert after_head['revision'] == HEAD_REVISION
    for table in TABLES:
        assert table in after_head['tables'], f'{table} missing after upgrade head'
    for table, indexes in EXPECTED_INDEXES.items():
        present = after_head['indexes'].get(table, set())
        assert indexes.issubset(present), f'{table} indexes missing: {indexes - present}'
    for table, cols in REQUIRED_COLUMNS.items():
        assert cols.issubset(after_head['columns'][table]), (
            f'{table} columns missing: {cols - after_head["columns"][table]}'
        )
    assert all(after_head['control'].values())
    assert 'source_type' not in after_head['inventory_cols']
    assert 'marketplace_enabled' not in after_head['inventory_cols']
    assert 'market_category_id' not in after_head['inventory_cols']

    # 040: category_id must be nullable for draft imports
    engine_cols = after_head['columns']['market_listings']
    assert 'category_id' in engine_cols

    command.downgrade(cfg, PREV_REVISION)
    after_down = asyncio.run(_schema_snapshot())
    assert after_down['revision'] == PREV_REVISION
    for table in TABLES:
        assert table not in after_down['tables'], f'{table} still present after downgrade'
    assert all(after_down['control'].values())

    command.upgrade(cfg, DOMAIN_REVISION)
    at_domain = asyncio.run(_schema_snapshot())
    assert at_domain['revision'] == DOMAIN_REVISION
    for table in DOMAIN_TABLES:
        assert table in at_domain['tables']
    assert MAPPING_TABLE not in at_domain['tables']

    command.upgrade(cfg, 'head')
    after_up = asyncio.run(_schema_snapshot())
    assert after_up['revision'] == HEAD_REVISION
    for table in TABLES:
        assert table in after_up['tables']
    assert all(after_up['control'].values())
