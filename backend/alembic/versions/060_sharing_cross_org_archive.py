"""Sharing listings: platform-wide catalog visibility + soft archive status.

Revision ID: 060_sharing_cross_org_archive
Revises: 059_manual_incomes
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = '060_sharing_cross_org_archive'
down_revision: Union[str, None] = '059_manual_incomes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Legacy soft-delete used status=done («Завершено»). Treat as archive going forward.
    op.execute(
        """
        UPDATE sharing_listings
        SET status = 'archived'
        WHERE status = 'done'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE sharing_listings
        SET status = 'done'
        WHERE status = 'archived'
        """
    )
