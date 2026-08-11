"""Partial-field geometry on sharing_listings.

Revision ID: 068_sharing_partial_field
Revises: 067_inventory_item_archive
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '068_sharing_partial_field'
down_revision: Union[str, None] = '067_inventory_item_archive'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sharing_listings',
        sa.Column(
            'sharing_scope',
            sa.String(length=20),
            nullable=False,
            server_default='full_field',
        ),
    )
    op.add_column(
        'sharing_listings',
        sa.Column('shared_polygon', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'sharing_listings',
        sa.Column('shared_area_ha', sa.Numeric(8, 2), nullable=True),
    )
    op.create_check_constraint(
        'ck_sharing_listings_sharing_scope',
        'sharing_listings',
        "sharing_scope IN ('full_field', 'partial_field')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_sharing_listings_sharing_scope', 'sharing_listings', type_='check')
    op.drop_column('sharing_listings', 'shared_area_ha')
    op.drop_column('sharing_listings', 'shared_polygon')
    op.drop_column('sharing_listings', 'sharing_scope')
