"""Scope work_types/equipment name uniqueness to org; tighten fields filter.

Revision ID: 054_org_scoped_ref_names
Revises: 053_field_work_location
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = '054_org_scoped_ref_names'
down_revision: Union[str, None] = '053_field_work_location'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # work_types: drop global UNIQUE(name) → UNIQUE(org_id, name)
    op.execute('ALTER TABLE work_types DROP CONSTRAINT IF EXISTS work_types_name_key')
    op.execute('DROP INDEX IF EXISTS work_types_name_key')
    op.create_unique_constraint(
        'uq_work_types_org_name',
        'work_types',
        ['org_id', 'name'],
    )

    # equipment: same anti-pattern (global name unique) — scope to org
    op.execute('ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_name_key')
    op.execute('DROP INDEX IF EXISTS equipment_name_key')
    op.create_unique_constraint(
        'uq_equipment_org_name',
        'equipment',
        ['org_id', 'name'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_equipment_org_name', 'equipment', type_='unique')
    op.create_unique_constraint('equipment_name_key', 'equipment', ['name'])

    op.drop_constraint('uq_work_types_org_name', 'work_types', type_='unique')
    op.create_unique_constraint('work_types_name_key', 'work_types', ['name'])
