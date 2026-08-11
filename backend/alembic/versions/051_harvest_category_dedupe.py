"""Merge duplicate harvest inventory categories into code=harvest.

Revision ID: 051_harvest_category_dedupe
Revises: 050_waiting_parts_status

Canonical row used by harvest flow: type=inventory_category, code=harvest,
name=«Урожай (на складе)» (see harvest_inventory.HARVEST_INVENTORY_CATEGORY).

Duplicates typically appear when Settings creates a near-identical name
(e.g. «Урожай на складе») with slug code ``urozhay_na_sklade`` — items under
that code never enter harvest flow (checks code == harvest only).

Also: UI previously showed a second hardcoded badge «Урожай на складе» on cards;
that is fixed in FE. This migration rebinds any leftover dict/item rows.
"""

from __future__ import annotations

import logging
import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = '051_harvest_category_dedupe'
down_revision: Union[str, None] = '050_waiting_parts_status'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger('alembic.runtime.migration')

CANONICAL_CODE = 'harvest'
CANONICAL_NAME = 'Урожай (на складе)'

DUPLICATE_CODES = {
    'urozhay_na_sklade',
    'urozhay',
    'harvest_stock',
    'harvest_warehouse',
}


def normalize_harvest_category_name(value: str | None) -> str:
    if not value:
        return ''
    text = ' '.join(value.replace('\u00a0', ' ').split()).strip().lower()
    text = re.sub(r'[()\[\]«»""]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def is_duplicate_harvest_category_name(name: str | None) -> bool:
    norm = normalize_harvest_category_name(name)
    if not norm:
        return False
    return norm in {
        'урожай на складе',
        'урожай',
        'урожай склад',
        'урожай на склад',
    }


def upgrade() -> None:
    bind = op.get_bind()

    # Explicit casts: asyncpg AmbiguousParameterError on bare :code/:name
    # (text vs varchar) without typed bind params.
    inserted = bind.execute(
        sa.text(
            """
            INSERT INTO org_dictionaries (
                id, org_id, type, code, name, is_active, sort_order, created_at
            )
            SELECT
                gen_random_uuid(),
                o.id,
                'inventory_category',
                CAST(:code AS varchar(80)),
                CAST(:name AS text),
                true,
                90,
                now()
            FROM organizations o
            WHERE EXISTS (
                SELECT 1 FROM org_dictionaries d
                WHERE d.org_id = o.id AND d.type = 'inventory_category'
            )
              AND NOT EXISTS (
                SELECT 1 FROM org_dictionaries d
                WHERE d.org_id = o.id
                  AND d.type = 'inventory_category'
                  AND d.code = CAST(:code AS varchar(80))
              )
            """
        ),
        {'code': CANONICAL_CODE, 'name': CANONICAL_NAME},
    )
    logger.info('ensured harvest category rows: %s', inserted.rowcount)

    bind.execute(
        sa.text(
            """
            UPDATE org_dictionaries
            SET name = CAST(:name AS text), is_active = true
            WHERE type = 'inventory_category' AND code = CAST(:code AS varchar(80))
            """
        ),
        {'code': CANONICAL_CODE, 'name': CANONICAL_NAME},
    )

    rows = (
        bind.execute(
            sa.text(
                """
                SELECT id, org_id, code, name
                FROM org_dictionaries
                WHERE type = 'inventory_category'
                  AND code IS DISTINCT FROM CAST(:code AS varchar(80))
                """
            ),
            {'code': CANONICAL_CODE},
        )
        .mappings()
        .all()
    )

    duplicate_ids: list[str] = []
    duplicate_codes_by_org: list[tuple[str, str]] = []
    for row in rows:
        code = str(row['code'] or '').strip()
        name = str(row['name'] or '')
        if code.lower() in DUPLICATE_CODES or is_duplicate_harvest_category_name(name):
            duplicate_ids.append(str(row['id']))
            duplicate_codes_by_org.append((str(row['org_id']), code))

    if not duplicate_ids:
        logger.info('no duplicate harvest category rows found')
        return

    rebound = 0
    for org_id, code in duplicate_codes_by_org:
        result = bind.execute(
            sa.text(
                """
                UPDATE inventory_items
                SET category = CAST(:canonical AS varchar(50))
                WHERE org_id = CAST(:org_id AS uuid)
                  AND lower(trim(category)) = lower(trim(CAST(:code AS varchar(80))))
                """
            ),
            {'canonical': CANONICAL_CODE, 'org_id': org_id, 'code': code},
        )
        rebound += result.rowcount or 0
    logger.info('rebound inventory_items to harvest: %s', rebound)

    if sa_inspect(bind).has_table('market_category_mappings'):
        mapped = 0
        for _org_id, code in duplicate_codes_by_org:
            result = bind.execute(
                sa.text(
                    """
                    UPDATE market_category_mappings
                    SET inventory_category_value = CAST(:canonical AS varchar(50))
                    WHERE lower(trim(inventory_category_value))
                        = lower(trim(CAST(:code AS varchar(80))))
                    """
                ),
                {'canonical': CANONICAL_CODE, 'code': code},
            )
            mapped += result.rowcount or 0
        logger.info('rebound market_category_mappings: %s', mapped)

    kind_fixed = bind.execute(
        sa.text(
            """
            UPDATE shipment_requests sr
            SET kind = 'harvest'
            FROM inventory_items ii
            WHERE sr.inventory_item_id = ii.id
              AND lower(trim(ii.category)) = 'harvest'
              AND sr.kind IS DISTINCT FROM 'harvest'
            """
        )
    )
    logger.info('shipment_requests kind→harvest: %s', kind_fixed.rowcount)

    deleted = 0
    for dup_id in duplicate_ids:
        result = bind.execute(
            sa.text(
                """
                DELETE FROM org_dictionaries
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {'id': dup_id},
        )
        deleted += result.rowcount or 0
    logger.info('deleted duplicate harvest category rows: %s', deleted)


def downgrade() -> None:
    # Non-destructive: cannot restore deleted duplicate dictionary rows.
    pass
