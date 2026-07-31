"""Internal messenger tables (org-scoped chats).

Revision ID: 032_messenger_chats
Revises: 031_shipment_req_op_link
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '032_messenger_chats'
down_revision = '031_shipment_req_op_link'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("type IN ('direct', 'group')", name='chats_type_chk'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['employees.id'], ondelete='RESTRICT'),
    )
    op.create_index('ix_chats_org_id', 'chats', ['org_id'])
    op.create_index('ix_chats_org_updated', 'chats', ['org_id', 'updated_at'])

    op.create_table(
        'chat_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'role',
            sa.String(length=20),
            nullable=False,
            server_default='member',
        ),
        sa.Column(
            'joined_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("role IN ('owner', 'member')", name='chat_members_role_chk'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chat_id'], ['chats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_chat_members_org_chat', 'chat_members', ['org_id', 'chat_id'])
    op.create_index('ix_chat_members_employee', 'chat_members', ['employee_id'])
    op.create_index(
        'uq_chat_members_active',
        'chat_members',
        ['chat_id', 'employee_id'],
        unique=True,
        postgresql_where=sa.text('left_at IS NULL'),
    )

    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('attachment_url', sa.String(length=500), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chat_id'], ['chats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['employees.id'], ondelete='RESTRICT'),
    )
    op.create_index('ix_chat_messages_org_chat', 'chat_messages', ['org_id', 'chat_id'])
    op.create_index(
        'ix_chat_messages_chat_created',
        'chat_messages',
        ['chat_id', 'created_at'],
    )

    op.create_table(
        'chat_message_reads',
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('last_read_message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('chat_id', 'employee_id', name='pk_chat_message_reads'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chat_id'], ['chats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['last_read_message_id'],
            ['chat_messages.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index(
        'ix_chat_message_reads_org_chat',
        'chat_message_reads',
        ['org_id', 'chat_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_chat_message_reads_org_chat', table_name='chat_message_reads')
    op.drop_table('chat_message_reads')

    op.drop_index('ix_chat_messages_chat_created', table_name='chat_messages')
    op.drop_index('ix_chat_messages_org_chat', table_name='chat_messages')
    op.drop_table('chat_messages')

    op.drop_index('uq_chat_members_active', table_name='chat_members')
    op.drop_index('ix_chat_members_employee', table_name='chat_members')
    op.drop_index('ix_chat_members_org_chat', table_name='chat_members')
    op.drop_table('chat_members')

    op.drop_index('ix_chats_org_updated', table_name='chats')
    op.drop_index('ix_chats_org_id', table_name='chats')
    op.drop_table('chats')
