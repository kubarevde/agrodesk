"""System location «Полевая работа» + code/is_system on locations.

Revision ID: 053_field_work_location
Revises: 052_shipment_request_comment
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '053_field_work_location'
down_revision: Union[str, None] = '052_shipment_request_comment'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FIELD_WORK_CODE = 'field_work'
FIELD_WORK_NAME = 'Полевая работа'
FIELD_WORK_DESCRIPTION = (
    'Системное место работы для типов с признаком «полевая работа» (агрокалендарь)'
)


def upgrade() -> None:
    op.add_column(
        'locations',
        sa.Column('code', sa.String(length=80), nullable=True),
    )
    op.add_column(
        'locations',
        sa.Column(
            'is_system',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.create_index(
        'uq_locations_org_code',
        'locations',
        ['org_id', 'code'],
        unique=True,
        postgresql_where=sa.text('code IS NOT NULL'),
    )

    # Promote existing rows named «Полевая работа» per org.
    op.execute(
        sa.text(
            """
            UPDATE locations
            SET
              code = :code,
              is_system = true,
              kind = 'object',
              is_active = true,
              description = COALESCE(NULLIF(description, ''), :description)
            WHERE name = :name
              AND code IS NULL
            """
        ).bindparams(
            code=FIELD_WORK_CODE,
            name=FIELD_WORK_NAME,
            description=FIELD_WORK_DESCRIPTION,
        )
    )

    # Seed missing system location for every organization.
    op.execute(
        sa.text(
            """
            INSERT INTO locations (
              id, org_id, name, description, is_active, kind, code, is_system
            )
            SELECT
              gen_random_uuid(),
              o.id,
              :name,
              :description,
              true,
              'object',
              :code,
              true
            FROM organizations o
            WHERE NOT EXISTS (
              SELECT 1
              FROM locations l
              WHERE l.org_id = o.id
                AND l.code = :code
            )
            """
        ).bindparams(
            code=FIELD_WORK_CODE,
            name=FIELD_WORK_NAME,
            description=FIELD_WORK_DESCRIPTION,
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM locations
            WHERE is_system = true
              AND code = :code
              AND NOT EXISTS (
                SELECT 1 FROM shifts s WHERE s.location_id = locations.id
              )
              AND NOT EXISTS (
                SELECT 1 FROM shifts s WHERE s.field_id = locations.id
              )
            """
        ).bindparams(code=FIELD_WORK_CODE)
    )
    op.execute(
        sa.text(
            """
            UPDATE locations
            SET code = NULL, is_system = false
            WHERE code = :code
            """
        ).bindparams(code=FIELD_WORK_CODE)
    )
    op.drop_index('uq_locations_org_code', table_name='locations')
    op.drop_column('locations', 'is_system')
    op.drop_column('locations', 'code')
