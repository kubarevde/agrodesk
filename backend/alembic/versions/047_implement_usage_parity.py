"""Implement usage logs + meter_at on implement_maintenance (parity with equipment).

Revision ID: 047_implement_usage_parity
Revises: 046_maintenance_types
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "047_implement_usage_parity"
down_revision: Union[str, None] = "046_maintenance_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "implement_maintenance",
        sa.Column("meter_at", sa.Numeric(10, 2), nullable=True),
    )
    op.create_table(
        "implement_usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "implement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("implements.id"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value_added", sa.Numeric(10, 2), nullable=False),
        sa.Column("meter_after", sa.Numeric(10, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_implement_usage_logs_implement_id",
        "implement_usage_logs",
        ["implement_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_implement_usage_logs_implement_id", table_name="implement_usage_logs")
    op.drop_table("implement_usage_logs")
    op.drop_column("implement_maintenance", "meter_at")
