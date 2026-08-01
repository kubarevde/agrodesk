"""Allow draft marketplace listings without category.

Revision ID: 040_listing_draft_category
Revises: 039_marketplace_domain

Draft imports (from inventory/shipment) need category filled before publish.
Does not touch inventory_items / shipments.

Note: revision id must fit alembic_version.version_num VARCHAR(32).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '040_listing_draft_category'
down_revision: Union[str, None] = '039_marketplace_domain'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'market_listings',
        'category_id',
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    # Reject downgrade if drafts without category exist — force archive first in ops.
    op.execute(
        sa.text(
            """
            UPDATE market_listings
            SET category_id = (
              SELECT id FROM market_categories ORDER BY sort_order, name LIMIT 1
            )
            WHERE category_id IS NULL
              AND EXISTS (SELECT 1 FROM market_categories LIMIT 1)
            """
        )
    )
    op.alter_column(
        'market_listings',
        'category_id',
        existing_type=sa.UUID(),
        nullable=False,
    )
