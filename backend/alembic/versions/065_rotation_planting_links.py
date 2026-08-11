"""Crop rotation plans + field_planting_id links for harvest/requests/shipments.

Revision ID: 065_rotation_planting_links
Revises: 064_planting_map_color
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '065_rotation_planting_links'
down_revision: Union[str, None] = '064_planting_map_color'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'field_rotation_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column(
            'field_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('locations.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('crop_code', sa.String(80), nullable=False),
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('area_ha', sa.Numeric(10, 4), nullable=False),
        sa.Column('season_year', sa.Integer(), nullable=False),
        sa.Column('planned_plant_at', sa.Date(), nullable=True),
        sa.Column('planned_harvest_at', sa.Date(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), nullable=False, server_default='active'),
        sa.Column(
            'linked_planting_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('field_plantings.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_field_rotation_plans_org_id', 'field_rotation_plans', ['org_id'])
    op.create_index('ix_field_rotation_plans_field_id', 'field_rotation_plans', ['field_id'])
    op.create_index('ix_field_rotation_plans_season_year', 'field_rotation_plans', ['season_year'])
    op.create_index('ix_field_rotation_plans_crop_code', 'field_rotation_plans', ['crop_code'])

    op.add_column(
        'inventory_operations',
        sa.Column(
            'field_planting_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('field_plantings.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index(
        'ix_inventory_operations_field_planting_id',
        'inventory_operations',
        ['field_planting_id'],
    )

    op.add_column(
        'shipment_requests',
        sa.Column(
            'field_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('locations.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'shipment_requests',
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'shipment_requests',
        sa.Column(
            'field_planting_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('field_plantings.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_shipment_requests_field_planting_id', 'shipment_requests', ['field_planting_id'])

    op.add_column(
        'shipments',
        sa.Column(
            'field_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('locations.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'shipments',
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'shipments',
        sa.Column(
            'field_planting_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('field_plantings.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_shipments_field_planting_id', 'shipments', ['field_planting_id'])


def downgrade() -> None:
    op.drop_index('ix_shipments_field_planting_id', table_name='shipments')
    op.drop_column('shipments', 'field_planting_id')
    op.drop_column('shipments', 'variety_id')
    op.drop_column('shipments', 'field_id')

    op.drop_index('ix_shipment_requests_field_planting_id', table_name='shipment_requests')
    op.drop_column('shipment_requests', 'field_planting_id')
    op.drop_column('shipment_requests', 'variety_id')
    op.drop_column('shipment_requests', 'field_id')

    op.drop_index('ix_inventory_operations_field_planting_id', table_name='inventory_operations')
    op.drop_column('inventory_operations', 'field_planting_id')

    op.drop_index('ix_field_rotation_plans_crop_code', table_name='field_rotation_plans')
    op.drop_index('ix_field_rotation_plans_season_year', table_name='field_rotation_plans')
    op.drop_index('ix_field_rotation_plans_field_id', table_name='field_rotation_plans')
    op.drop_index('ix_field_rotation_plans_org_id', table_name='field_rotation_plans')
    op.drop_table('field_rotation_plans')
