"""Link completed shipment request → inventory_operations (no inventory schema change).

Revision ID: 031_shipment_req_op_link
Revises: 030_shipment_requests
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '031_shipment_req_op_link'
down_revision = '030_shipment_requests'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'shipment_requests',
        sa.Column('inventory_operation_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_shipment_requests_inventory_operation_id',
        'shipment_requests',
        'inventory_operations',
        ['inventory_operation_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        'ix_shipment_requests_inventory_operation_id',
        'shipment_requests',
        ['inventory_operation_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        'ix_shipment_requests_inventory_operation_id',
        table_name='shipment_requests',
    )
    op.drop_constraint(
        'fk_shipment_requests_inventory_operation_id',
        'shipment_requests',
        type_='foreignkey',
    )
    op.drop_column('shipment_requests', 'inventory_operation_id')
