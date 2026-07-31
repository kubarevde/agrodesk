"""Shipment request kind + cleanup ambiguous harvest inventory labels.

Revision ID: 034_request_kind_domains
Revises: 033_harvest_tmc_link
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '034_request_kind_domains'
down_revision: Union[str, None] = '033_harvest_tmc_link'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'shipment_requests',
        sa.Column('kind', sa.String(length=20), nullable=False, server_default='inventory'),
    )
    op.create_check_constraint(
        'shipment_requests_kind_chk',
        'shipment_requests',
        "kind IN ('inventory', 'harvest')",
    )
    op.create_index('ix_shipment_requests_kind', 'shipment_requests', ['kind'])

    # Backfill from linked inventory category (harvest SKU → kind=harvest).
    op.execute(
        """
        UPDATE shipment_requests sr
        SET kind = 'harvest'
        FROM inventory_items ii
        WHERE sr.inventory_item_id = ii.id
          AND lower(trim(ii.category)) = 'harvest'
        """
    )

    # Soft-disable ambiguous demo rows named just «Урожай» without proper harvest category/link.
    op.execute(
        """
        UPDATE inventory_items
        SET is_active = false
        WHERE lower(trim(name)) IN ('урожай', 'урожай (тест)', 'test harvest', 'harvest')
          AND (
            lower(trim(category)) IS DISTINCT FROM 'harvest'
            OR crop_code IS NULL
          )
        """
    )


def downgrade() -> None:
    op.drop_index('ix_shipment_requests_kind', table_name='shipment_requests')
    op.drop_constraint('shipment_requests_kind_chk', 'shipment_requests', type_='check')
    op.drop_column('shipment_requests', 'kind')
