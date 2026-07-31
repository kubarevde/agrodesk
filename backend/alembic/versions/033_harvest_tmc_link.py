"""Harvest inventory category + optional crop_code / shipment_request link.

Revision ID: 033_harvest_tmc_link
Revises: 032_messenger_chats
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '033_harvest_tmc_link'
down_revision: Union[str, None] = '032_messenger_chats'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'inventory_items',
        sa.Column('crop_code', sa.String(length=80), nullable=True),
    )
    op.add_column(
        'shipments',
        sa.Column('shipment_request_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'shipments_shipment_request_id_fkey',
        'shipments',
        'shipment_requests',
        ['shipment_request_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        'ix_shipments_shipment_request_id',
        'shipments',
        ['shipment_request_id'],
    )

    # Seed harvest category for orgs that already have inventory_category rows.
    op.execute(
        """
        INSERT INTO org_dictionaries (id, org_id, type, code, name, is_active, sort_order, created_at)
        SELECT gen_random_uuid(), o.id, 'inventory_category', 'harvest', 'Урожай (на складе)', true, 90, now()
        FROM organizations o
        WHERE EXISTS (
            SELECT 1 FROM org_dictionaries d
            WHERE d.org_id = o.id AND d.type = 'inventory_category'
        )
        AND NOT EXISTS (
            SELECT 1 FROM org_dictionaries d
            WHERE d.org_id = o.id AND d.type = 'inventory_category' AND d.code = 'harvest'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM org_dictionaries
        WHERE type = 'inventory_category' AND code = 'harvest'
        """
    )
    op.drop_index('ix_shipments_shipment_request_id', table_name='shipments')
    op.drop_constraint('shipments_shipment_request_id_fkey', 'shipments', type_='foreignkey')
    op.drop_column('shipments', 'shipment_request_id')
    op.drop_column('inventory_items', 'crop_code')
