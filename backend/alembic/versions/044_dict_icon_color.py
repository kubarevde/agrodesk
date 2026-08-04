"""Add optional icon/color for dictionary items (implement categories).

Revision ID: 044_dict_icon_color
Revises: 043_org_hierarchy_links
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '044_dict_icon_color'
down_revision: Union[str, None] = '043_org_hierarchy_links'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Defaults for known implement_category codes (preserve current UI look).
_IMPLEMENT_STYLE_DEFAULTS: dict[str, tuple[str, str]] = {
    'sowing': ('sprout', 'success'),
    'spraying': ('droplets', 'blue'),
    'tillage': ('tractor', 'amber'),
    'harvest': ('wheat', 'orange'),
    'transport': ('truck', 'violet'),
}


def upgrade() -> None:
    op.add_column(
        'org_dictionaries',
        sa.Column('icon', sa.String(length=40), nullable=True),
    )
    op.add_column(
        'org_dictionaries',
        sa.Column('color', sa.String(length=40), nullable=True),
    )

    bind = op.get_bind()
    for code, (icon, color) in _IMPLEMENT_STYLE_DEFAULTS.items():
        bind.execute(
            sa.text(
                """
                UPDATE org_dictionaries
                SET icon = :icon, color = :color
                WHERE type = 'implement_category'
                  AND code = :code
                  AND icon IS NULL
                """
            ),
            {'icon': icon, 'color': color, 'code': code},
        )


def downgrade() -> None:
    op.drop_column('org_dictionaries', 'color')
    op.drop_column('org_dictionaries', 'icon')
