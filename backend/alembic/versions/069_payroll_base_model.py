"""Payroll base model: payment_scheme on rates, expense payroll linkage columns.

Revision ID: 069_payroll_base_model
Revises: 068_sharing_partial_field

Additive only:
- employee_rates.payment_scheme (default hourly) + piecework_unit
- employee_rates.org_id SET NOT NULL (backfill via employees.org_id)
- expenses.employee_id + payroll_run_line_id (nullable; FK to payroll_run_lines later)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '069_payroll_base_model'
down_revision: Union[str, None] = '068_sharing_partial_field'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PAYMENT_SCHEMES = ('hourly', 'per_shift', 'monthly', 'piecework')


def upgrade() -> None:
    # --- employee_rates.org_id backfill + NOT NULL ---
    op.execute(
        """
        UPDATE employee_rates er
        SET org_id = e.org_id
        FROM employees e
        WHERE er.employee_id = e.id
          AND er.org_id IS NULL
          AND e.org_id IS NOT NULL
        """
    )
    # Orphans (no employee / no org): attach to first organization if any remain NULL
    op.execute(
        """
        UPDATE employee_rates
        SET org_id = (SELECT id FROM organizations ORDER BY created_at NULLS LAST, id LIMIT 1)
        WHERE org_id IS NULL
          AND EXISTS (SELECT 1 FROM organizations LIMIT 1)
        """
    )
    op.alter_column(
        'employee_rates',
        'org_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.add_column(
        'employee_rates',
        sa.Column(
            'payment_scheme',
            sa.String(length=20),
            nullable=False,
            server_default='hourly',
        ),
    )
    op.execute("UPDATE employee_rates SET payment_scheme = 'hourly' WHERE payment_scheme IS NULL")
    op.create_check_constraint(
        'ck_employee_rates_payment_scheme',
        'employee_rates',
        "payment_scheme IN ('hourly', 'per_shift', 'monthly', 'piecework')",
    )
    op.add_column(
        'employee_rates',
        sa.Column('piecework_unit', sa.String(length=20), nullable=True),
    )

    # --- expenses payroll linkage (columns only; payroll_run_lines FK in later prompt) ---
    op.add_column(
        'expenses',
        sa.Column(
            'employee_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'expenses',
        sa.Column('payroll_run_line_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        'ix_expenses_employee_id',
        'expenses',
        ['employee_id'],
        unique=False,
    )
    op.create_index(
        'uq_expenses_payroll_run_line_id',
        'expenses',
        ['payroll_run_line_id'],
        unique=True,
        postgresql_where=sa.text('payroll_run_line_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index(
        'uq_expenses_payroll_run_line_id',
        table_name='expenses',
        postgresql_where=sa.text('payroll_run_line_id IS NOT NULL'),
    )
    op.drop_index('ix_expenses_employee_id', table_name='expenses')
    op.drop_column('expenses', 'payroll_run_line_id')
    op.drop_column('expenses', 'employee_id')

    op.drop_column('employee_rates', 'piecework_unit')
    op.drop_constraint('ck_employee_rates_payment_scheme', 'employee_rates', type_='check')
    op.drop_column('employee_rates', 'payment_scheme')

    # Re-open nullable org_id (pre-migration state)
    op.alter_column(
        'employee_rates',
        'org_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
