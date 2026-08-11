"""Add shift end_date and time_adjusted for manual time corrections.

Revision ID: 061_shift_time_adjust
Revises: 060_sharing_cross_org_archive
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '061_shift_time_adjust'
down_revision: Union[str, None] = '060_sharing_cross_org_archive'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('shifts', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column(
        'shifts',
        sa.Column('time_adjusted', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('shifts', 'time_adjusted')
    op.drop_column('shifts', 'end_date')
