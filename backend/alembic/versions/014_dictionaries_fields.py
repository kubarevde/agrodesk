"""Org dictionaries + location uniqueness + inventory category as text + location kind.

Revision ID: 014_dictionaries_fields
Revises: 013_service_inventory
"""

from alembic import op


revision = '014_dictionaries_fields'
down_revision = '013_service_inventory'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS org_dictionaries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          org_id UUID NOT NULL REFERENCES organizations(id),
          type VARCHAR(50) NOT NULL,
          name VARCHAR(200) NOT NULL,
          code VARCHAR(80) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_org_dictionaries_org_type_code UNIQUE (org_id, type, code),
          CONSTRAINT uq_org_dictionaries_org_type_name UNIQUE (org_id, type, name)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_org_dictionaries_org_type
        ON org_dictionaries (org_id, type)
        """
    )

    # Locations: per-org uniqueness instead of global name unique
    op.execute('ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_name_key')
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_locations_org_name'
          ) THEN
            ALTER TABLE locations
              ADD CONSTRAINT uq_locations_org_name UNIQUE (org_id, name);
          END IF;
        END $$
        """
    )

    # Distinguish work objects vs crop fields in the shared locations table
    op.execute(
        """
        ALTER TABLE locations
          ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'object'
        """
    )
    op.execute(
        """
        UPDATE locations
        SET kind = 'field'
        WHERE crop_type IS NOT NULL OR name LIKE 'Поле%'
        """
    )

    # Inventory categories become free-text codes (dictionary-driven)
    op.execute(
        """
        ALTER TABLE inventory_items
          ALTER COLUMN category TYPE VARCHAR(50)
          USING category::text
        """
    )


def downgrade() -> None:
    op.execute('ALTER TABLE locations DROP COLUMN IF EXISTS kind')
    op.execute('ALTER TABLE locations DROP CONSTRAINT IF EXISTS uq_locations_org_name')
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'locations_name_key'
          ) THEN
            ALTER TABLE locations ADD CONSTRAINT locations_name_key UNIQUE (name);
          END IF;
        END $$
        """
    )
    op.execute('DROP TABLE IF EXISTS org_dictionaries')
