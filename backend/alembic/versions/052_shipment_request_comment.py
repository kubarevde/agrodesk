"""Add optional comment to shipment_requests.

Revision ID: 052_shipment_request_comment
Revises: 051_harvest_category_dedupe
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '052_shipment_request_comment'
down_revision: Union[str, None] = '051_harvest_category_dedupe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'shipment_requests',
        sa.Column('comment', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('shipment_requests', 'comment')
