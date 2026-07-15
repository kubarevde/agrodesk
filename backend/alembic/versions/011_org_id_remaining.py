"""Add org_id to inventory, expenses, shipments, implements.

Backfills NULL rows to the first organization (slug main/demo).
"""

from alembic import op


revision = '011_org_id_remaining'
down_revision = '010_multi_org'
branch_labels = None
depends_on = None

_ORG_TABLES = (
    'inventory_items',
    'expenses',
    'shipments',
    'implements',
)


def upgrade() -> None:
    # Ensure at least one org exists for backfill
    op.execute(
        """
        INSERT INTO organizations (name, slug)
        SELECT 'Основная организация', 'main'
        WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1)
        """
    )

    for table in _ORG_TABLES:
        op.execute(
            f"""
            ALTER TABLE {table}
              ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id)
            """
        )
        op.execute(
            f"""
            UPDATE {table}
            SET org_id = (
              SELECT id FROM organizations
              ORDER BY CASE WHEN slug IN ('main', 'demo') THEN 0 ELSE 1 END, created_at
              LIMIT 1
            )
            WHERE org_id IS NULL
            """
        )
        op.execute(
            f"""
            ALTER TABLE {table}
              ALTER COLUMN org_id SET NOT NULL
            """
        )
        op.execute(
            f"""
            CREATE INDEX IF NOT EXISTS idx_{table}_org ON {table}(org_id)
            """
        )

    # Replace global unique name with per-org uniqueness
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_name_key'
          ) THEN
            ALTER TABLE inventory_items DROP CONSTRAINT inventory_items_name_key;
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_org_name
        ON inventory_items (org_id, name)
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'implements_name_key'
          ) THEN
            ALTER TABLE implements DROP CONSTRAINT implements_name_key;
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_implements_org_name
        ON implements (org_id, name)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS uq_implements_org_name')
    op.execute('DROP INDEX IF EXISTS uq_inventory_items_org_name')
    for table in _ORG_TABLES:
        op.execute(f'DROP INDEX IF EXISTS idx_{table}_org')
        op.execute(f'ALTER TABLE {table} DROP COLUMN IF EXISTS org_id')
