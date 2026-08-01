"""Create market_category_mapping (inventory code → market category).

Revision ID: 041_mkt_inv_cat_map
Revises: 040_listing_draft_category

Separate tables: does not alter inventory_items or org_dictionaries.
Note: revision id must fit alembic_version.version_num VARCHAR(32).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '041_mkt_inv_cat_map'
down_revision: Union[str, None] = '040_listing_draft_category'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'market_category_mapping',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('inventory_category_value', sa.String(length=50), nullable=False),
        sa.Column('market_category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['market_category_id'],
            ['market_categories.id'],
            ondelete='CASCADE',
        ),
        sa.UniqueConstraint(
            'inventory_category_value',
            name='uq_market_category_mapping_inv_value',
        ),
    )
    op.create_index(
        'ix_market_category_mapping_market_category_id',
        'market_category_mapping',
        ['market_category_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_market_category_mapping_market_category_id',
        table_name='market_category_mapping',
    )
    op.drop_table('market_category_mapping')
