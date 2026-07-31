"""Shipment requests (intent to ship inventory ТМЦ).

Revision ID: 030_shipment_requests
Revises: 029_support_attach_tmpls
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '030_shipment_requests'
down_revision = '029_support_attach_tmpls'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'shipment_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('customer_name', sa.String(length=200), nullable=False),
        sa.Column('quantity', sa.Numeric(12, 2), nullable=False),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('planned_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            'priority',
            sa.String(length=20),
            nullable=False,
            server_default='normal',
        ),
        sa.Column(
            'status',
            sa.String(length=20),
            nullable=False,
            server_default='new',
        ),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'shift_id',
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment='Optional future link to a shift; unused in app logic yet',
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
        sa.CheckConstraint(
            "priority IN ('normal', 'urgent')",
            name='shipment_requests_priority_chk',
        ),
        sa.CheckConstraint(
            "status IN ('new', 'in_progress', 'done', 'cancelled')",
            name='shipment_requests_status_chk',
        ),
        sa.CheckConstraint('quantity > 0', name='shipment_requests_quantity_chk'),
        sa.CheckConstraint('price >= 0', name='shipment_requests_price_chk'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['inventory_item_id'],
            ['inventory_items.id'],
            ondelete='RESTRICT',
        ),
        sa.ForeignKeyConstraint(['created_by'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['assigned_to'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id'], ondelete='SET NULL'),
    )
    op.create_index(
        'ix_shipment_requests_org_status_planned',
        'shipment_requests',
        ['org_id', 'status', 'planned_at'],
    )
    op.create_index(
        'ix_shipment_requests_org_item',
        'shipment_requests',
        ['org_id', 'inventory_item_id'],
    )

    op.create_table(
        'shipment_request_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['request_id'],
            ['shipment_requests.id'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['employees.id'], ondelete='RESTRICT'),
    )
    op.create_index(
        'ix_shipment_request_attachments_org_id',
        'shipment_request_attachments',
        ['org_id'],
    )
    op.create_index(
        'ix_shipment_request_attachments_request_id',
        'shipment_request_attachments',
        ['request_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_shipment_request_attachments_request_id',
        table_name='shipment_request_attachments',
    )
    op.drop_index(
        'ix_shipment_request_attachments_org_id',
        table_name='shipment_request_attachments',
    )
    op.drop_table('shipment_request_attachments')

    op.drop_index('ix_shipment_requests_org_item', table_name='shipment_requests')
    op.drop_index('ix_shipment_requests_org_status_planned', table_name='shipment_requests')
    op.drop_table('shipment_requests')
