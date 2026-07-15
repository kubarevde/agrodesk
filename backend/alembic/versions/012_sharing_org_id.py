"""Add org_id to sharing_listings (backfill from owner employee).

Revision ID: 012_sharing_org_id
Revises: 011_org_id_remaining
"""

from alembic import op


revision = '012_sharing_org_id'
down_revision = '011_org_id_remaining'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sharing_listings
          ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id)
        """
    )
    op.execute(
        """
        UPDATE sharing_listings sl
        SET org_id = e.org_id
        FROM employees e
        WHERE sl.owner_id = e.id
          AND sl.org_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE sharing_listings
        SET org_id = (
          SELECT id FROM organizations
          ORDER BY CASE WHEN slug IN ('main', 'demo') THEN 0 ELSE 1 END, created_at
          LIMIT 1
        )
        WHERE org_id IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE sharing_listings
          ALTER COLUMN org_id SET NOT NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_sharing_listings_org ON sharing_listings(org_id)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_sharing_listings_org')
    op.execute('ALTER TABLE sharing_listings DROP COLUMN IF EXISTS org_id')
