"""Multiple fields per agro plan task.

Revision ID: 015_agro_plan_fields
Revises: 014_dictionaries_fields
"""

from alembic import op


revision = '015_agro_plan_fields'
down_revision = '014_dictionaries_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS agro_plan_fields (
          plan_id UUID NOT NULL REFERENCES agro_plan(id) ON DELETE CASCADE,
          location_id UUID NOT NULL REFERENCES locations(id),
          PRIMARY KEY (plan_id, location_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_agro_plan_fields_location
        ON agro_plan_fields (location_id)
        """
    )
    # Backfill primary location_id into junction
    op.execute(
        """
        INSERT INTO agro_plan_fields (plan_id, location_id)
        SELECT id, location_id FROM agro_plan
        WHERE location_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS agro_plan_fields')
