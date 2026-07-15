"""Add implement service meters + inventory op purpose/equipment link.

Revision ID: 013_service_inventory
Revises: 012_sharing_org_id
"""

from alembic import op


revision = '013_service_inventory'
down_revision = '012_sharing_org_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE implements
          ADD COLUMN IF NOT EXISTS current_usage_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS service_interval_hours NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS next_service_hours NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS last_service_date DATE
        """
    )
    op.execute(
        """
        ALTER TABLE inventory_operations
          ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id),
          ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) NOT NULL DEFAULT 'general'
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_inventory_operations_equipment
        ON inventory_operations(equipment_id)
        """
    )
    # Recalculate equipment next_to_at with ceil formula where interval is set
    op.execute(
        """
        UPDATE equipment
        SET next_to_at = CASE
          WHEN to_interval IS NULL OR to_interval <= 0 THEN next_to_at
          WHEN COALESCE(current_meter, 0) <= 0 THEN to_interval
          ELSE CEIL(COALESCE(current_meter, 0) / to_interval) * to_interval
        END
        WHERE to_interval IS NOT NULL AND to_interval > 0
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_inventory_operations_equipment')
    op.execute(
        """
        ALTER TABLE inventory_operations
          DROP COLUMN IF EXISTS equipment_id,
          DROP COLUMN IF EXISTS purpose
        """
    )
    op.execute(
        """
        ALTER TABLE implements
          DROP COLUMN IF EXISTS current_usage_hours,
          DROP COLUMN IF EXISTS service_interval_hours,
          DROP COLUMN IF EXISTS next_service_hours,
          DROP COLUMN IF EXISTS last_service_date
        """
    )
