"""Support attachments + reply templates.

Revision ID: 029_support_attach_tmpls
Revises: 028_support_tickets
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '029_support_attach_tmpls'
down_revision = '028_support_tickets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'support_ticket_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('uploaded_by_employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('uploaded_by_superadmin_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['support_ticket_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(
            ['uploaded_by_superadmin_id'],
            ['superadmin_users.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index(
        'ix_support_ticket_attachments_ticket_id',
        'support_ticket_attachments',
        ['ticket_id'],
    )
    op.create_index(
        'ix_support_ticket_attachments_message_id',
        'support_ticket_attachments',
        ['message_id'],
    )

    op.create_table(
        'support_reply_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('category', sa.String(length=40), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
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
    )
    op.create_index(
        'ix_support_reply_templates_category',
        'support_reply_templates',
        ['category'],
    )


def downgrade() -> None:
    op.drop_index('ix_support_reply_templates_category', table_name='support_reply_templates')
    op.drop_table('support_reply_templates')
    op.drop_index('ix_support_ticket_attachments_message_id', table_name='support_ticket_attachments')
    op.drop_index('ix_support_ticket_attachments_ticket_id', table_name='support_ticket_attachments')
    op.drop_table('support_ticket_attachments')
