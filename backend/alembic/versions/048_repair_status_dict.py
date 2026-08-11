"""Repair status dictionary + waiting_parts flag (split from status).

Revision ID: 048_repair_status_dict
Revises: 047_implement_usage_parity
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "048_repair_status_dict"
down_revision: Union[str, None] = "047_implement_usage_parity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "equipment_maintenance",
        sa.Column(
            "waiting_parts",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Preserve history: former status waiting_parts → in_progress + flag.
    op.execute(
        """
        UPDATE equipment_maintenance
        SET waiting_parts = true,
            status = 'in_progress'
        WHERE status = 'waiting_parts'
        """
    )
    # Seed repair_status dictionary for every org (idempotent).
    op.execute(
        """
        INSERT INTO org_dictionaries (
            id, org_id, type, code, name, is_active, sort_order, default_interval, created_at
        )
        SELECT
            gen_random_uuid(),
            o.id,
            'repair_status',
            v.code,
            v.name,
            true,
            v.sort_order,
            NULL,
            now()
        FROM organizations o
        CROSS JOIN (
            VALUES
                ('open', 'Открыт', 0),
                ('in_progress', 'В ремонте', 1),
                ('done', 'Завершён', 2),
                ('cancelled', 'Отменён', 3)
        ) AS v(code, name, sort_order)
        WHERE NOT EXISTS (
            SELECT 1
            FROM org_dictionaries d
            WHERE d.org_id = o.id
              AND d.type = 'repair_status'
              AND d.code = v.code
        )
        """
    )


def downgrade() -> None:
    # Best-effort restore of legacy status value from flag.
    op.execute(
        """
        UPDATE equipment_maintenance
        SET status = 'waiting_parts'
        WHERE waiting_parts = true
          AND status = 'in_progress'
        """
    )
    op.execute("DELETE FROM org_dictionaries WHERE type = 'repair_status'")
    op.drop_column("equipment_maintenance", "waiting_parts")
