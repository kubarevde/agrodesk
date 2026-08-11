"""Archive metadata on inventory_items; soft-archive stays is_active.

Revision ID: 067_inventory_item_archive
Revises: 066_variety_links
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '067_inventory_item_archive'
down_revision: Union[str, None] = '066_variety_links'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'inventory_items',
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'inventory_items',
        sa.Column('archived_by', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        'inventory_items',
        sa.Column('archive_reason', sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        'fk_inventory_items_archived_by',
        'inventory_items',
        'employees',
        ['archived_by'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        'ix_inventory_items_archived_by',
        'inventory_items',
        ['archived_by'],
    )


def downgrade() -> None:
    op.drop_index('ix_inventory_items_archived_by', table_name='inventory_items')
    op.drop_constraint('fk_inventory_items_archived_by', 'inventory_items', type_='foreignkey')
    op.drop_column('inventory_items', 'archive_reason')
    op.drop_column('inventory_items', 'archived_by')
    op.drop_column('inventory_items', 'archived_at')
