"""Add crop_code to locations and shipments; soft backfill from crop dictionary.

Revision ID: 035_crop_code_unify
Revises: 034_request_kind_domains
"""

from __future__ import annotations

import logging
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '035_crop_code_unify'
down_revision: Union[str, None] = '034_request_kind_domains'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger('alembic.runtime.migration')


def _normalize_name(value: str | None) -> str:
    if not value:
        return ''
    return ' '.join(value.replace('\u00a0', ' ').split()).strip()


def _backfill_crop_codes() -> None:
    bind = op.get_bind()
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
            if not key:
                continue
            buckets.setdefault(key, set()).add(code)
        name_to_code: dict[str, str] = {}
        ambiguous = 0
        for key, codes in buckets.items():
            if len(codes) == 1:
                name_to_code[key] = next(iter(codes))
            else:
                ambiguous += 1
        if ambiguous:
            logger.warning(
                'crop_code backfill org=%s: %s ambiguous crop names skipped',
                org_id,
                ambiguous,
            )

        for table in ('locations', 'shipments'):
            targets = bind.execute(
                sa.text(
                    f"""
                    SELECT id, crop_type FROM {table}
                    WHERE org_id = :org_id
                      AND crop_code IS NULL
                      AND crop_type IS NOT NULL
                      AND btrim(crop_type) <> ''
                    """
                ),
                {'org_id': org_id},
            ).fetchall()
            filled = 0
            skipped = 0
            for row_id, crop_type in targets:
                key = _normalize_name(crop_type).casefold()
                code = name_to_code.get(key)
                if not code:
                    skipped += 1
                    continue
                bind.execute(
                    sa.text(
                        f'UPDATE {table} SET crop_code = :code WHERE id = :id AND crop_code IS NULL'
                    ),
                    {'code': code, 'id': row_id},
                )
                filled += 1
            logger.info(
                'crop_code backfill org=%s table=%s filled=%s skipped=%s',
                org_id,
                table,
                filled,
                skipped,
            )


def upgrade() -> None:
    op.add_column(
        'locations',
        sa.Column('crop_code', sa.String(length=80), nullable=True),
    )
    op.add_column(
        'shipments',
        sa.Column('crop_code', sa.String(length=80), nullable=True),
    )
    op.create_index('ix_locations_crop_code', 'locations', ['org_id', 'crop_code'])
    op.create_index('ix_shipments_crop_code', 'shipments', ['org_id', 'crop_code'])
    _backfill_crop_codes()


def downgrade() -> None:
    # Non-destructive: keep data columns; only drop indexes then columns if rolling back
    # schema experiment. Prefer restore-from-backup for prod (see rollback-harvest-unify.md).
    op.drop_index('ix_shipments_crop_code', table_name='shipments')
    op.drop_index('ix_locations_crop_code', table_name='locations')
    op.drop_column('shipments', 'crop_code')
    op.drop_column('locations', 'crop_code')
