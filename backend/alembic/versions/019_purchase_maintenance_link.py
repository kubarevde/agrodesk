"""Link purchase planner items to maintenance (repair) records.

Revision ID: 019_purchase_maintenance_link
Revises: 018_purchase_planner
"""

from alembic import op

revision = '019_purchase_maintenance_link'
down_revision = '018_purchase_planner'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE purchase_planner_items
          ADD COLUMN IF NOT EXISTS maintenance_id UUID
            REFERENCES equipment_maintenance(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_purchase_planner_maintenance_id
          ON purchase_planner_items (maintenance_id)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS ix_purchase_planner_maintenance_id')
    op.execute(
        'ALTER TABLE purchase_planner_items DROP COLUMN IF EXISTS maintenance_id'
    )
