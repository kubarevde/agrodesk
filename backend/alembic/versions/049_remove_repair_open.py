"""Remove repair_status 'open'; migrate rows to in_progress.

Revision ID: 049_remove_repair_open
Revises: 048_repair_status_dict
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "049_remove_repair_open"
down_revision: Union[str, None] = "048_repair_status_dict"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Preserve history: rename open → in_progress (same operational meaning).
    op.execute(
        """
        UPDATE equipment_maintenance
        SET status = 'in_progress'
        WHERE status = 'open'
        """
    )
    # Hide from Settings / selects; keep row for audit of old codes if any.
    op.execute(
        """
        UPDATE org_dictionaries
        SET is_active = false
        WHERE type = 'repair_status'
          AND code = 'open'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE org_dictionaries
        SET is_active = true
        WHERE type = 'repair_status'
          AND code = 'open'
        """
    )
