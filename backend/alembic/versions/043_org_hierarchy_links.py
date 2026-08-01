"""Additive org_hierarchy_links: head org → child org (Phase 1).

Revision ID: 043_org_hierarchy_links
Revises: 042_tg_id_hygiene

Does not alter organizations, auth, JWT, or tenant APIs.
Soft-delete remains Organization.is_active (application-level).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '043_org_hierarchy_links'
down_revision: Union[str, None] = '042_tg_id_hygiene'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'org_hierarchy_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('head_org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('child_org_id', postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(
            ['head_org_id'],
            ['organizations.id'],
            name='fk_org_hierarchy_links_head',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['child_org_id'],
            ['organizations.id'],
            name='fk_org_hierarchy_links_child',
            ondelete='CASCADE',
        ),
        sa.UniqueConstraint('child_org_id', name='uq_org_hierarchy_links_child'),
        sa.CheckConstraint(
            'head_org_id <> child_org_id',
            name='ck_org_hierarchy_links_no_self',
        ),
    )
    op.create_index(
        'ix_org_hierarchy_links_head_org_id',
        'org_hierarchy_links',
        ['head_org_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_org_hierarchy_links_head_org_id', table_name='org_hierarchy_links')
    op.drop_table('org_hierarchy_links')
