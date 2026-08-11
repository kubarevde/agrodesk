"""Create org_tasks table for non-production organizational tasks.

Revision ID: 076_org_tasks
Revises: 075_salary_expense_period_date

Separate from agro_plans / shifts — see app.models.org_task docstring.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '076_org_tasks'
down_revision: Union[str, None] = '075_salary_expense_period_date'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'org_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id'),
            nullable=False,
        ),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('visibility_type', sa.String(length=32), nullable=False),
        sa.Column(
            'assignee_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('status', sa.String(length=20), nullable=False),
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
        sa.Column(
            'completed_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=True,
        ),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'cancelled_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('employees.id'),
            nullable=True,
        ),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status IN ('active', 'completed', 'cancelled')",
            name='ck_org_tasks_status',
        ),
        sa.CheckConstraint(
            "visibility_type IN ('all_employees', 'specific_employee')",
            name='ck_org_tasks_visibility',
        ),
        sa.CheckConstraint(
            "(visibility_type = 'all_employees' AND assignee_id IS NULL) OR "
            "(visibility_type = 'specific_employee' AND assignee_id IS NOT NULL)",
            name='ck_org_tasks_assignee_visibility',
        ),
    )
    op.create_index('ix_org_tasks_org_id', 'org_tasks', ['org_id'])
    op.create_index('ix_org_tasks_assignee_id', 'org_tasks', ['assignee_id'])
    op.create_index('ix_org_tasks_status', 'org_tasks', ['status'])
    op.create_index('ix_org_tasks_org_status_created', 'org_tasks', ['org_id', 'status', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_org_tasks_org_status_created', table_name='org_tasks')
    op.drop_index('ix_org_tasks_status', table_name='org_tasks')
    op.drop_index('ix_org_tasks_assignee_id', table_name='org_tasks')
    op.drop_index('ix_org_tasks_org_id', table_name='org_tasks')
    op.drop_table('org_tasks')
