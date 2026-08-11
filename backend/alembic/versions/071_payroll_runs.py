"""Payroll runs, lines, adjustments (Prompt #3).

Revision ID: 071_payroll_runs
Revises: 070_piecework_records
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '071_payroll_runs'
down_revision: Union[str, None] = '070_piecework_records'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payroll_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column(
            'created_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'confirmed_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('draft', 'confirmed', 'paid')",
            name='ck_payroll_runs_status',
        ),
        sa.CheckConstraint(
            'period_end >= period_start',
            name='ck_payroll_runs_period',
        ),
    )
    op.create_index('ix_payroll_runs_org_id', 'payroll_runs', ['org_id'])
    op.create_index(
        'ix_payroll_runs_org_period',
        'payroll_runs',
        ['org_id', 'period_start', 'period_end'],
    )

    op.create_table(
        'payroll_run_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'payroll_run_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('payroll_runs.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'employee_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=False,
        ),
        sa.Column('payment_scheme', sa.String(length=20), nullable=False),
        sa.Column('base_calculated_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('adjustments_total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('source_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('payout_status', sa.String(length=20), nullable=False, server_default='unpaid'),
        sa.CheckConstraint(
            "payment_scheme IN ('hourly', 'per_shift', 'monthly', 'piecework')",
            name='ck_payroll_run_lines_scheme',
        ),
        sa.CheckConstraint(
            "payout_status IN ('unpaid', 'partially_paid', 'paid')",
            name='ck_payroll_run_lines_payout_status',
        ),
    )
    op.create_index('ix_payroll_run_lines_run_id', 'payroll_run_lines', ['payroll_run_id'])
    op.create_index('ix_payroll_run_lines_employee_id', 'payroll_run_lines', ['employee_id'])

    op.create_table(
        'payroll_adjustments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'payroll_run_line_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('payroll_run_lines.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('sign', sa.SmallInteger(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column(
            'created_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "type IN ('bonus', 'penalty', 'deduction', 'other')",
            name='ck_payroll_adjustments_type',
        ),
        sa.CheckConstraint('sign IN (-1, 1)', name='ck_payroll_adjustments_sign'),
        sa.CheckConstraint('amount >= 0', name='ck_payroll_adjustments_amount'),
    )
    op.create_index(
        'ix_payroll_adjustments_line_id',
        'payroll_adjustments',
        ['payroll_run_line_id'],
    )

    # Complete expenses.payroll_run_line_id FK left as column-only in Prompt #1.
    op.create_foreign_key(
        'fk_expenses_payroll_run_line_id',
        'expenses',
        'payroll_run_lines',
        ['payroll_run_line_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_expenses_payroll_run_line_id', 'expenses', type_='foreignkey')
    op.drop_index('ix_payroll_adjustments_line_id', table_name='payroll_adjustments')
    op.drop_table('payroll_adjustments')
    op.drop_index('ix_payroll_run_lines_employee_id', table_name='payroll_run_lines')
    op.drop_index('ix_payroll_run_lines_run_id', table_name='payroll_run_lines')
    op.drop_table('payroll_run_lines')
    op.drop_index('ix_payroll_runs_org_period', table_name='payroll_runs')
    op.drop_index('ix_payroll_runs_org_id', table_name='payroll_runs')
    op.drop_table('payroll_runs')
