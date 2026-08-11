"""Add field_plantings table (multi-crop assignments on a field).

Revision ID: 063_field_plantings
Revises: 062_crop_varieties
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '063_field_plantings'
down_revision: Union[str, None] = '062_crop_varieties'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'field_plantings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        sa.Column(
            'field_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('locations.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('crop_code', sa.String(length=80), nullable=False),
        sa.Column(
            'variety_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crop_varieties.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('area_ha', sa.Numeric(10, 4), nullable=False),
        sa.Column('planted_at', sa.Date(), nullable=True),
        sa.Column('harvested_at', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='planted'),
        sa.Column('season_year', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('polygon', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index('ix_field_plantings_org_id', 'field_plantings', ['org_id'])
    op.create_index('ix_field_plantings_field_id', 'field_plantings', ['field_id'])
    op.create_index('ix_field_plantings_crop_code', 'field_plantings', ['crop_code'])
    op.create_index('ix_field_plantings_variety_id', 'field_plantings', ['variety_id'])
    op.create_index('ix_field_plantings_season_year', 'field_plantings', ['season_year'])
    op.create_index(
        'ix_field_plantings_field_season',
        'field_plantings',
        ['field_id', 'season_year'],
    )


def downgrade() -> None:
    op.drop_index('ix_field_plantings_field_season', table_name='field_plantings')
    op.drop_index('ix_field_plantings_season_year', table_name='field_plantings')
    op.drop_index('ix_field_plantings_variety_id', table_name='field_plantings')
    op.drop_index('ix_field_plantings_crop_code', table_name='field_plantings')
    op.drop_index('ix_field_plantings_field_id', table_name='field_plantings')
    op.drop_index('ix_field_plantings_org_id', table_name='field_plantings')
    op.drop_table('field_plantings')
