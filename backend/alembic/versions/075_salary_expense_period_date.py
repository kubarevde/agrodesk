"""Align salary expense.date with payroll run period_end.

Revision ID: 075_salary_expense_period_date
Revises: 074_payroll_payout_kind
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = '075_salary_expense_period_date'
down_revision: Union[str, None] = '074_payroll_payout_kind'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Previously expense.date was confirm day, so date filters mixed periods.
    op.execute(
        """
        UPDATE expenses e
        SET date = r.period_end
        FROM payroll_run_lines l
        JOIN payroll_runs r ON r.id = l.payroll_run_id
        WHERE e.payroll_run_line_id = l.id
          AND e.category = 'salary'
          AND e.date IS DISTINCT FROM r.period_end
        """
    )


def downgrade() -> None:
    # Irreversible data fix — confirm timestamps are not stored on expenses.
    pass
