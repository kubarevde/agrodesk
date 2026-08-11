"""Add is_cross_org flag on chats for admin-to-admin DMs across orgs.

Revision ID: 058_chat_cross_org
Revises: 057_tmc_shipments
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '058_chat_cross_org'
down_revision: Union[str, None] = '057_tmc_shipments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'chats',
        sa.Column(
            'is_cross_org',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column('chats', 'is_cross_org')
