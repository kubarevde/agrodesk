"""Add map_color to field_plantings for culture map highlight.

Revision ID: 064_planting_map_color
Revises: 063_field_plantings
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '064_planting_map_color'
down_revision: Union[str, None] = '063_field_plantings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'field_plantings',
        sa.Column('map_color', sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('field_plantings', 'map_color')
