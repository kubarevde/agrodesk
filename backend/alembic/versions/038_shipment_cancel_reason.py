"""Add cancel_reason to shipment_requests.

Revision ID: 038_shipment_cancel_reason
Revises: 037_harvest_field_income
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '038_shipment_cancel_reason'
down_revision: Union[str, None] = '037_harvest_field_income'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'shipment_requests',
        sa.Column('cancel_reason', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('shipment_requests', 'cancel_reason')
