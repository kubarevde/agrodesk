"""Remainder-close fields on payroll_run_lines (Prompt #6).

Revision ID: 073_payroll_remainder_close
Revises: 072_payroll_payouts
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '073_payroll_remainder_close'
down_revision: Union[str, None] = '072_payroll_payouts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'payroll_run_lines',
        sa.Column('remainder_closed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'payroll_run_lines',
        sa.Column(
            'remainder_closed_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'payroll_run_lines',
        sa.Column('remainder_close_comment', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('payroll_run_lines', 'remainder_close_comment')
    op.drop_column('payroll_run_lines', 'remainder_closed_by')
    op.drop_column('payroll_run_lines', 'remainder_closed_at')
