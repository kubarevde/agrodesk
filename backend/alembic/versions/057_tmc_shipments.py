"""Add tmc_shipments for managerial non-harvest outbound (parallel to shipments).

Revision ID: 057_tmc_shipments
Revises: 056_notification_prefs
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '057_tmc_shipments'
down_revision: Union[str, None] = '056_notification_prefs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tmc_shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column(
            'inventory_item_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('inventory_items.id', ondelete='RESTRICT'),
            nullable=False,
        ),
        sa.Column('item_name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=80), nullable=False),
        sa.Column('unit', sa.String(length=40), nullable=False),
        sa.Column('quantity', sa.Numeric(12, 3), nullable=False),
        sa.Column('price_per_unit', sa.Numeric(12, 2), nullable=True),
        sa.Column('destination', sa.String(length=200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column(
            'shipment_request_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('shipment_requests.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'created_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )
    op.create_index('ix_tmc_shipments_org_date', 'tmc_shipments', ['org_id', 'date'])
    op.create_index('ix_tmc_shipments_inventory_item_id', 'tmc_shipments', ['inventory_item_id'])
    op.create_index('ix_tmc_shipments_shipment_request_id', 'tmc_shipments', ['shipment_request_id'])


def downgrade() -> None:
    op.drop_index('ix_tmc_shipments_shipment_request_id', table_name='tmc_shipments')
    op.drop_index('ix_tmc_shipments_inventory_item_id', table_name='tmc_shipments')
    op.drop_index('ix_tmc_shipments_org_date', table_name='tmc_shipments')
    op.drop_table('tmc_shipments')
