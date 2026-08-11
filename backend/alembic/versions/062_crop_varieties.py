"""Add crop_varieties table (sorts under org crop dictionary).

Revision ID: 062_crop_varieties
Revises: 061_shift_time_adjust
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '062_crop_varieties'
down_revision: Union[str, None] = '061_shift_time_adjust'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'crop_varieties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        sa.Column('crop_code', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint('org_id', 'crop_code', 'name', name='uq_crop_varieties_org_crop_name'),
    )
    op.create_index('ix_crop_varieties_org_id', 'crop_varieties', ['org_id'])
    op.create_index('ix_crop_varieties_crop_code', 'crop_varieties', ['crop_code'])
    op.create_index(
        'ix_crop_varieties_org_crop',
        'crop_varieties',
        ['org_id', 'crop_code'],
    )


def downgrade() -> None:
    op.drop_index('ix_crop_varieties_org_crop', table_name='crop_varieties')
    op.drop_index('ix_crop_varieties_crop_code', table_name='crop_varieties')
    op.drop_index('ix_crop_varieties_org_id', table_name='crop_varieties')
    op.drop_table('crop_varieties')
