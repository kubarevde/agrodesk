"""Add maintenance_type dictionary + optional default_interval on org_dictionaries.

Revision ID: 046_maintenance_types
Revises: 045_org_region
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_maintenance_types"
down_revision: Union[str, None] = "045_org_region"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "org_dictionaries",
        sa.Column("default_interval", sa.Numeric(12, 2), nullable=True),
    )
    op.execute(
        """
        INSERT INTO org_dictionaries (
            id, org_id, type, code, name, is_active, sort_order, default_interval, created_at
        )
        SELECT
            gen_random_uuid(),
            o.id,
            'maintenance_type',
            v.code,
            v.name,
            true,
            v.sort_order,
            v.default_interval,
            NOW()
        FROM organizations o
        CROSS JOIN (
            VALUES
                ('to_1', 'ТО-1', 0, 250::numeric),
                ('to_2', 'ТО-2', 1, 500::numeric),
                ('oil_change', 'Замена масла', 2, 250::numeric),
                ('filter_change', 'Замена фильтра', 3, 250::numeric),
                ('repair', 'Ремонт', 4, NULL),
                ('other', 'Другое', 5, NULL)
        ) AS v(code, name, sort_order, default_interval)
        WHERE NOT EXISTS (
            SELECT 1 FROM org_dictionaries d
            WHERE d.org_id = o.id
              AND d.type = 'maintenance_type'
              AND d.code = v.code
        )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM org_dictionaries WHERE type = 'maintenance_type'")
    op.drop_column("org_dictionaries", "default_interval")
