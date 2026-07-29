"""Alembic: access_groups + employees.access_group_id (reversible, no data loss).

Revision ID: 025_access_groups
Revises: 024_shift_delete_fk
"""

from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '025_access_groups'
down_revision = '024_shift_delete_fk'
branch_labels = None
depends_on = None

SUPPLIER_SECTIONS = ['my-shift', 'purchase-planner', 'inventory']
SUPPLIER_ACTIONS = [
    'shift.open_own',
    'shift.close_own',
    'purchase.create',
    'purchase.manage',
    'inventory.operate',
    'inventory.manage_items',
]


def upgrade() -> None:
    op.create_table(
        'access_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=True),
        sa.Column(
            'is_system',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
        sa.Column(
            'sections',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            'actions',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
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
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('org_id', 'code', name='uq_access_groups_org_code'),
        sa.UniqueConstraint('org_id', 'name', name='uq_access_groups_org_name'),
    )
    op.create_index('ix_access_groups_org_id', 'access_groups', ['org_id'])

    op.add_column(
        'employees',
        sa.Column('access_group_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_employees_access_group_id',
        'employees',
        'access_groups',
        ['access_group_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_employees_access_group_id', 'employees', ['access_group_id'])

    # Seed «Снабженец» for every existing org — does not assign anyone / no data loss.
    conn = op.get_bind()
    org_ids = conn.execute(sa.text('SELECT id FROM organizations')).fetchall()
    for (org_id,) in org_ids:
        exists = conn.execute(
            sa.text(
                "SELECT 1 FROM access_groups WHERE org_id = :org_id AND code = 'supplier'"
            ),
            {'org_id': org_id},
        ).fetchone()
        if exists:
            continue
        conn.execute(
            sa.text(
                """
                INSERT INTO access_groups
                  (id, org_id, name, code, is_system, sections, actions)
                VALUES
                  (:id, :org_id, :name, 'supplier', true,
                   CAST(:sections AS jsonb), CAST(:actions AS jsonb))
                """
            ),
            {
                'id': str(__import__('uuid').uuid4()),
                'org_id': org_id,
                'name': 'Снабженец',
                'sections': json.dumps(SUPPLIER_SECTIONS),
                'actions': json.dumps(SUPPLIER_ACTIONS),
            },
        )


def downgrade() -> None:
    op.drop_index('ix_employees_access_group_id', table_name='employees')
    op.drop_constraint('fk_employees_access_group_id', 'employees', type_='foreignkey')
    op.drop_column('employees', 'access_group_id')
    op.drop_index('ix_access_groups_org_id', table_name='access_groups')
    op.drop_table('access_groups')
