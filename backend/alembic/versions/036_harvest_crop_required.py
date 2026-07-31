"""Harvest SKU: require crop_code; backfill; soft-disable test rows.

Revision ID: 036_harvest_crop_required
Revises: 035_crop_code_unify

Policy for test harvest rows (dev noise):
- Soft-deactivate names matching ``Domain harvest%`` / ``%тест%`` / generic ``Урожай``.
- After name→code backfill, remaining harvest rows without crop_code are also deactivated
  (cannot be edited as harvest without a culture going forward).
- Production-like rows (e.g. «Пшеница (урожай на складе)» with crop_code) stay active.
"""

from __future__ import annotations

import logging
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '036_harvest_crop_required'
down_revision: Union[str, None] = '035_crop_code_unify'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger('alembic.runtime.migration')


def _normalize_name(value: str | None) -> str:
    if not value:
        return ''
    return ' '.join(value.replace('\u00a0', ' ').split()).strip()


def upgrade() -> None:
    bind = op.get_bind()

    # Clear crop_code on non-harvest items (ignore leftover codes).
    cleared = bind.execute(
        sa.text(
            """
            UPDATE inventory_items
            SET crop_code = NULL
            WHERE crop_code IS NOT NULL
              AND lower(trim(category)) IS DISTINCT FROM 'harvest'
            """
        )
    )
    logger.info('cleared crop_code on non-harvest items: %s', cleared.rowcount)

    orgs = bind.execute(sa.text('SELECT id FROM organizations')).fetchall()
    for (org_id,) in orgs:
        rows = bind.execute(
            sa.text(
                """
                SELECT code, name FROM org_dictionaries
                WHERE org_id = :org_id AND type = 'crop' AND is_active IS TRUE
                """
            ),
            {'org_id': org_id},
        ).fetchall()
        buckets: dict[str, set[str]] = {}
        for code, name in rows:
            key = _normalize_name(name).casefold()
            if key:
                buckets.setdefault(key, set()).add(code)
        name_to_code = {
            key: next(iter(codes)) for key, codes in buckets.items() if len(codes) == 1
        }

        targets = bind.execute(
            sa.text(
                """
                SELECT id, name FROM inventory_items
                WHERE org_id = :org_id
                  AND lower(trim(category)) = 'harvest'
                  AND (crop_code IS NULL OR btrim(crop_code) = '')
                """
            ),
            {'org_id': org_id},
        ).fetchall()
        filled = 0
        skipped = 0
        for item_id, name in targets:
            # Prefer matching dictionary name contained in item name (e.g. «Пшеница (урожай…)»).
            matched: str | None = None
            item_key = _normalize_name(name).casefold()
            if item_key in name_to_code:
                matched = name_to_code[item_key]
            else:
                for crop_name, code in name_to_code.items():
                    if crop_name and crop_name in item_key:
                        matched = code
                        break
            if not matched:
                skipped += 1
                continue
            bind.execute(
                sa.text(
                    """
                    UPDATE inventory_items
                    SET crop_code = :code
                    WHERE id = :id AND (crop_code IS NULL OR btrim(crop_code) = '')
                    """
                ),
                {'code': matched, 'id': item_id},
            )
            filled += 1
        logger.info(
            'harvest crop_code backfill org=%s filled=%s skipped=%s',
            org_id,
            filled,
            skipped,
        )

    # Soft-disable obvious test / incomplete harvest SKUs (data kept, is_active=false).
    deactivated = bind.execute(
        sa.text(
            """
            UPDATE inventory_items
            SET is_active = false
            WHERE lower(trim(category)) = 'harvest'
              AND (
                name ILIKE 'Domain harvest%'
                OR lower(name) LIKE '%тест%'
                OR lower(trim(name)) IN ('урожай', 'урожай (тест)', 'test harvest', 'harvest')
                OR crop_code IS NULL
                OR btrim(crop_code) = ''
              )
            """
        )
    )
    logger.info('soft-deactivated test/incomplete harvest items: %s', deactivated.rowcount)


def downgrade() -> None:
    # Non-destructive: cannot restore previous crop_code values cleared from non-harvest
    # or re-activate rows without a snapshot. Prefer DB restore (rollback-harvest-unify.md).
    # No schema columns added — downgrade is a no-op for structure.
    pass
