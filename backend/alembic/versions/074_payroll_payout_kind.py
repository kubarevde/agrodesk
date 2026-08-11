"""Add payout_kind to distinguish advances from salary payments.

Revision ID: 074_payroll_payout_kind
Revises: 073_payroll_remainder_close
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '074_payroll_payout_kind'
down_revision: Union[str, None] = '073_payroll_remainder_close'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'payroll_payouts',
        sa.Column(
            'payout_kind',
            sa.String(20),
            nullable=False,
            server_default='salary_payment',
        ),
    )
    # Unlinked rows were advances before an explicit kind existed.
    op.execute(
        """
        UPDATE payroll_payouts
        SET payout_kind = 'advance'
        WHERE payroll_run_line_id IS NULL
        """
    )
    op.create_check_constraint(
        'ck_payroll_payouts_kind',
        'payroll_payouts',
        "payout_kind IN ('advance', 'salary_payment')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_payroll_payouts_kind', 'payroll_payouts', type_='check')
    op.drop_column('payroll_payouts', 'payout_kind')
