"""Add employees.notification_prefs JSONB for per-type notification toggles.

Revision ID: 056_notification_prefs
Revises: 055_shipment_requests_always_on
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '056_notification_prefs'
down_revision: Union[str, None] = '055_shipment_requests_always_on'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'employees',
        sa.Column(
            'notification_prefs',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column('employees', 'notification_prefs')
