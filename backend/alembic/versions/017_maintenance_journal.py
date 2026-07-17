"""Extend equipment_maintenance for repair journal + checklist items.

Revision ID: 017_maintenance_journal
Revises: 016_audit_log
"""

from alembic import op

revision = '017_maintenance_journal'
down_revision = '016_audit_log'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing TO history rows are completed work — mark done so they are not
    # treated as open repairs. New repair entries set status=in_progress explicitly.
    op.execute(
        """
        ALTER TABLE equipment_maintenance
          ADD COLUMN IF NOT EXISTS implement_id UUID REFERENCES implements(id),
          ADD COLUMN IF NOT EXISTS status VARCHAR(20),
          ADD COLUMN IF NOT EXISTS date_returned DATE,
          ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'
        """
    )
    op.execute(
        """
        UPDATE equipment_maintenance
        SET status = 'done'
        WHERE status IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE equipment_maintenance
          ALTER COLUMN status SET DEFAULT 'in_progress',
          ALTER COLUMN status SET NOT NULL
        """
    )
    op.execute(
        """
        ALTER TABLE equipment_maintenance
          ALTER COLUMN equipment_id DROP NOT NULL
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'equipment_maintenance_asset_chk'
          ) THEN
            ALTER TABLE equipment_maintenance
              ADD CONSTRAINT equipment_maintenance_asset_chk
              CHECK (equipment_id IS NOT NULL OR implement_id IS NOT NULL);
          END IF;
        END $$
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS maintenance_checklist_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          maintenance_id UUID NOT NULL REFERENCES equipment_maintenance(id) ON DELETE CASCADE,
          item_type VARCHAR(20) NOT NULL,
          description VARCHAR(300) NOT NULL,
          is_done BOOLEAN NOT NULL DEFAULT false,
          cost NUMERIC(12,2),
          done_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_maintenance_checklist_maintenance_id
          ON maintenance_checklist_items (maintenance_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_equipment_maintenance_status
          ON equipment_maintenance (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_equipment_maintenance_implement_id
          ON equipment_maintenance (implement_id)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS ix_equipment_maintenance_implement_id')
    op.execute('DROP INDEX IF EXISTS ix_equipment_maintenance_status')
    op.execute('DROP INDEX IF EXISTS ix_maintenance_checklist_maintenance_id')
    op.execute('DROP TABLE IF EXISTS maintenance_checklist_items')
    op.execute(
        """
        ALTER TABLE equipment_maintenance
          DROP CONSTRAINT IF EXISTS equipment_maintenance_asset_chk
        """
    )
    op.execute(
        """
        UPDATE equipment_maintenance
        SET equipment_id = (
          SELECT e.id FROM equipment e LIMIT 1
        )
        WHERE equipment_id IS NULL
        """
    )
    # Best-effort: cannot safely restore NOT NULL if orphan implement-only rows exist
    op.execute(
        """
        ALTER TABLE equipment_maintenance
          DROP COLUMN IF EXISTS priority,
          DROP COLUMN IF EXISTS date_returned,
          DROP COLUMN IF EXISTS status,
          DROP COLUMN IF EXISTS implement_id
        """
    )
