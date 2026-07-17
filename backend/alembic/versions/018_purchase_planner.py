"""Purchase planner checklist.

Revision ID: 018_purchase_planner
Revises: 017_maintenance_journal
"""

from alembic import op

revision = '018_purchase_planner'
down_revision = '017_maintenance_journal'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS purchase_planner_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          org_id UUID NOT NULL REFERENCES organizations(id),
          title VARCHAR(300) NOT NULL,
          category VARCHAR(20) NOT NULL DEFAULT 'general',
          equipment_id UUID REFERENCES equipment(id),
          implement_id UUID REFERENCES implements(id),
          inventory_item_id UUID REFERENCES inventory_items(id),
          urgency VARCHAR(20) NOT NULL DEFAULT 'normal',
          status VARCHAR(20) NOT NULL DEFAULT 'planned',
          purchase_place VARCHAR(200),
          responsible_id UUID REFERENCES employees(id),
          estimated_cost NUMERIC(12,2),
          actual_cost NUMERIC(12,2),
          expense_id UUID REFERENCES expenses(id),
          maintenance_checklist_item_id UUID REFERENCES maintenance_checklist_items(id),
          notes TEXT,
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          purchased_at TIMESTAMPTZ,
          CONSTRAINT purchase_planner_category_chk CHECK (
            (category = 'equipment' AND equipment_id IS NOT NULL
              AND implement_id IS NULL AND inventory_item_id IS NULL)
            OR (category = 'implement' AND implement_id IS NOT NULL
              AND equipment_id IS NULL AND inventory_item_id IS NULL)
            OR (category = 'inventory_item' AND inventory_item_id IS NOT NULL
              AND equipment_id IS NULL AND implement_id IS NULL)
            OR (category = 'general'
              AND equipment_id IS NULL AND implement_id IS NULL AND inventory_item_id IS NULL)
          )
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_purchase_urgency_status
          ON purchase_planner_items (urgency, status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_purchase_planner_org_id
          ON purchase_planner_items (org_id)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_purchase_planner_org_id')
    op.execute('DROP INDEX IF EXISTS idx_purchase_urgency_status')
    op.execute('DROP TABLE IF EXISTS purchase_planner_items')
