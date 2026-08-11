"""Add manual incomes table (parallel to expenses; shipment revenue stays separate).

Revision ID: 059_manual_incomes
Revises: 058_chat_cross_org
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '059_manual_incomes'
down_revision: Union[str, None] = '058_chat_cross_org'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'incomes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('counterparty', sa.String(length=200), nullable=True),
        sa.Column('payment_method', sa.String(length=100), nullable=True),
        sa.Column(
            'created_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )
    op.create_index('ix_incomes_org_date', 'incomes', ['org_id', 'date'])
    op.create_index('ix_incomes_category', 'incomes', ['org_id', 'category'])


def downgrade() -> None:
    op.drop_index('ix_incomes_category', table_name='incomes')
    op.drop_index('ix_incomes_org_date', table_name='incomes')
    op.drop_table('incomes')
