"""Minimal payroll_payouts table for unconfirm guard (Prompt #4 / used by #6).

Revision ID: 072_payroll_payouts
Revises: 071_payroll_runs

Full payout API is Prompt #6; this migration only creates the storage so
confirmed → draft rollback can detect existing payouts safely.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '072_payroll_payouts'
down_revision: Union[str, None] = '071_payroll_runs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payroll_payouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        # NULL = advance before run line exists (Prompt #6).
        sa.Column(
            'payroll_run_line_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('payroll_run_lines.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'employee_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=False,
        ),
        sa.Column('amount_paid', sa.Numeric(12, 2), nullable=False),
        sa.Column('payout_method', sa.String(length=30), nullable=False),
        sa.Column('payout_date', sa.Date(), nullable=False),
        sa.Column(
            'confirmed_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('advance_period_hint', sa.String(length=64), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "payout_method IN ('cash', 'bank_transfer', 'card', 'other')",
            name='ck_payroll_payouts_method',
        ),
        sa.CheckConstraint('amount_paid > 0', name='ck_payroll_payouts_amount'),
    )
    op.create_index('ix_payroll_payouts_org_id', 'payroll_payouts', ['org_id'])
    op.create_index(
        'ix_payroll_payouts_line_id',
        'payroll_payouts',
        ['payroll_run_line_id'],
    )
    op.create_index('ix_payroll_payouts_employee_id', 'payroll_payouts', ['employee_id'])


def downgrade() -> None:
    op.drop_index('ix_payroll_payouts_employee_id', table_name='payroll_payouts')
    op.drop_index('ix_payroll_payouts_line_id', table_name='payroll_payouts')
    op.drop_index('ix_payroll_payouts_org_id', table_name='payroll_payouts')
    op.drop_table('payroll_payouts')
