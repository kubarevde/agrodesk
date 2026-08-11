"""Create piecework_records for piecework payment scheme (Prompt #2).

Revision ID: 070_piecework_records
Revises: 069_payroll_base_model
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '070_piecework_records'
down_revision: Union[str, None] = '069_payroll_base_model'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'piecework_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        sa.Column(
            'employee_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=False,
        ),
        sa.Column(
            'shift_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('shifts.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'work_type_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('work_types.id'),
            nullable=False,
        ),
        sa.Column('quantity', sa.Numeric(12, 3), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('rate_applied', sa.Numeric(10, 2), nullable=False),
        sa.Column('calculated_amount', sa.Numeric(12, 2), nullable=False),
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
    )
    op.create_index('ix_piecework_records_org_id', 'piecework_records', ['org_id'])
    op.create_index('ix_piecework_records_employee_id', 'piecework_records', ['employee_id'])
    op.create_index('ix_piecework_records_shift_id', 'piecework_records', ['shift_id'])
    op.create_index('ix_piecework_records_date', 'piecework_records', ['date'])


def downgrade() -> None:
    op.drop_index('ix_piecework_records_date', table_name='piecework_records')
    op.drop_index('ix_piecework_records_shift_id', table_name='piecework_records')
    op.drop_index('ix_piecework_records_employee_id', table_name='piecework_records')
    op.drop_index('ix_piecework_records_org_id', table_name='piecework_records')
    op.drop_table('piecework_records')
