"""Add inventory_operations.field_id for field harvest income.

Revision ID: 037_harvest_field_income
Revises: 036_harvest_crop_required

Additive: nullable FK locations.id ON DELETE SET NULL.
Does not change existing rows. Does not write to shipments.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '037_harvest_field_income'
down_revision: Union[str, None] = '036_harvest_crop_required'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'inventory_operations',
        sa.Column('field_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_inventory_operations_field_id',
        'inventory_operations',
        'locations',
        ['field_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        'ix_inventory_operations_field_id',
        'inventory_operations',
        ['field_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_inventory_operations_field_id', table_name='inventory_operations')
    op.drop_constraint(
        'fk_inventory_operations_field_id',
        'inventory_operations',
        type_='foreignkey',
    )
    op.drop_column('inventory_operations', 'field_id')
