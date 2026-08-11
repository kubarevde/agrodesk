"""Add optional organizations.region (RF catalog code).

Revision ID: 045_org_region
Revises: 044_dict_icon_color
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '045_org_region'
down_revision: Union[str, None] = '044_dict_icon_color'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'organizations',
        sa.Column('region', sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('organizations', 'region')
