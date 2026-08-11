"""Add shipment_requests_enabled=true for any org that had the legacy flag off.

Revision ID: 055_shipment_requests_always_on
Revises: 054_org_scoped_ref_names
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = '055_shipment_requests_always_on'
down_revision: Union[str, None] = '054_org_scoped_ref_names'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Heal legacy disables — does not delete shipment_requests rows.
    op.execute(
        """
        UPDATE organizations
        SET settings = jsonb_set(
          coalesce(settings, '{}'::jsonb),
          '{shipment_requests_enabled}',
          'true'::jsonb,
          true
        )
        WHERE lower(coalesce(settings->>'shipment_requests_enabled', 'true'))
              IN ('false', '0', 'no', 'off')
        """
    )


def downgrade() -> None:
    # Irreversible heal — keep true.
    pass
