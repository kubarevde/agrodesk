"""Support tickets + messages for platform tech support.

Revision ID: 028_support_tickets
Revises: 027_field_weather_centroid
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '028_support_tickets'
down_revision = '027_field_weather_centroid'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'support_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_role', sa.String(length=20), nullable=False),
        sa.Column('author_name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=40), nullable=False),
        sa.Column('subject', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='new'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'),
        sa.Column(
            'assignee_superadmin_id',
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            'unread_for_user',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
        sa.Column(
            'unread_for_staff',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['assignee_superadmin_id'],
            ['superadmin_users.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_support_tickets_org_id', 'support_tickets', ['org_id'])
    op.create_index('ix_support_tickets_author_id', 'support_tickets', ['author_id'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index(
        'ix_support_tickets_unread_staff',
        'support_tickets',
        ['unread_for_staff'],
    )

    op.create_table(
        'support_ticket_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_type', sa.String(length=20), nullable=False),
        sa.Column('author_employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('author_superadmin_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('author_name', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(
            ['author_superadmin_id'],
            ['superadmin_users.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index(
        'ix_support_ticket_messages_ticket_id',
        'support_ticket_messages',
        ['ticket_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_support_ticket_messages_ticket_id', table_name='support_ticket_messages')
    op.drop_table('support_ticket_messages')
    op.drop_index('ix_support_tickets_unread_staff', table_name='support_tickets')
    op.drop_index('ix_support_tickets_status', table_name='support_tickets')
    op.drop_index('ix_support_tickets_author_id', table_name='support_tickets')
    op.drop_index('ix_support_tickets_org_id', table_name='support_tickets')
    op.drop_table('support_tickets')
