"""Optional variety on inventory items, incomes, and agro plans.

Revision ID: 066_variety_links
Revises: 065_rotation_planting_links
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '066_variety_links'
down_revision: Union[str, None] = '065_rotation_planting_links'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'inventory_items',
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_inventory_items_variety_id', 'inventory_items', ['variety_id'])

    op.add_column(
        'incomes',
        sa.Column('crop_code', sa.String(length=80), nullable=True),
    )
    op.add_column(
        'incomes',
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_incomes_variety_id', 'incomes', ['variety_id'])
    op.create_index('ix_incomes_crop_code', 'incomes', ['crop_code'])

    op.add_column(
        'agro_plan',
        sa.Column(
            'field_planting_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('field_plantings.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'agro_plan',
        sa.Column('crop_code', sa.String(length=80), nullable=True),
    )
    op.add_column(
        'agro_plan',
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_agro_plan_field_planting_id', 'agro_plan', ['field_planting_id'])
    op.create_index('ix_agro_plan_variety_id', 'agro_plan', ['variety_id'])


def downgrade() -> None:
    op.drop_index('ix_agro_plan_variety_id', table_name='agro_plan')
    op.drop_index('ix_agro_plan_field_planting_id', table_name='agro_plan')
    op.drop_column('agro_plan', 'variety_id')
    op.drop_column('agro_plan', 'crop_code')
    op.drop_column('agro_plan', 'field_planting_id')

    op.drop_index('ix_incomes_crop_code', table_name='incomes')
    op.drop_index('ix_incomes_variety_id', table_name='incomes')
    op.drop_column('incomes', 'variety_id')
    op.drop_column('incomes', 'crop_code')

    op.drop_index('ix_inventory_items_variety_id', table_name='inventory_items')
    op.drop_column('inventory_items', 'variety_id')
