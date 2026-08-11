"""Re-add waiting_parts as selectable repair_status (not in_repair).

Revision ID: 050_waiting_parts_status
Revises: 049_remove_repair_open
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "050_waiting_parts_status"
down_revision: Union[str, None] = "049_remove_repair_open"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure dictionary code exists and is active (selectable without «В ремонте»).
    op.execute(
        """
        INSERT INTO org_dictionaries (
            id, org_id, type, code, name, is_active, sort_order, default_interval, created_at
        )
        SELECT
            gen_random_uuid(),
            o.id,
            'repair_status',
            'waiting_parts',
            'Ожидает запчасти',
            true,
            1,
            NULL,
            now()
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1
            FROM org_dictionaries d
            WHERE d.org_id = o.id
              AND d.type = 'repair_status'
              AND d.code = 'waiting_parts'
        )
        """
    )
    op.execute(
        """
        UPDATE org_dictionaries
        SET is_active = true,
            name = 'Ожидает запчасти'
        WHERE type = 'repair_status'
          AND code = 'waiting_parts'
        """
    )
    # Keep sort: in_progress=0, waiting_parts=1, done=2, cancelled=3
    op.execute(
        """
        UPDATE org_dictionaries
        SET sort_order = CASE code
            WHEN 'in_progress' THEN 0
            WHEN 'waiting_parts' THEN 1
            WHEN 'done' THEN 2
            WHEN 'cancelled' THEN 3
            ELSE sort_order
        END
        WHERE type = 'repair_status'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE org_dictionaries
        SET is_active = false
        WHERE type = 'repair_status'
          AND code = 'waiting_parts'
        """
    )
