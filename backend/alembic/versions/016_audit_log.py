"""Global audit log for significant entity changes.

Revision ID: 016_audit_log
Revises: 015_agro_plan_fields
"""

from alembic import op

revision = '016_audit_log'
down_revision = '015_agro_plan_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          org_id UUID NOT NULL REFERENCES organizations(id),
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID NOT NULL,
          action VARCHAR(20) NOT NULL,
          changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
          changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          before_data JSONB,
          after_data JSONB,
          summary TEXT
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_entity
        ON audit_log (entity_type, entity_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_changed_at
        ON audit_log (changed_at DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_org_changed_at
        ON audit_log (org_id, changed_at DESC)
        """
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS audit_log')
