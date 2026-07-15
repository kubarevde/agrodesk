"""Add organizations, superadmin_users, and org_id columns."""

from alembic import op


revision = '010_multi_org'
down_revision = '009_employee_rates'
branch_labels = None
depends_on = None

_ORG_TABLES = (
    'employees',
    'shifts',
    'locations',
    'work_types',
    'equipment',
    'employee_rates',
)


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          plan VARCHAR(50) NOT NULL DEFAULT 'trial',
          is_active BOOLEAN NOT NULL DEFAULT true,
          owner_email VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          trial_ends_at DATE,
          max_employees INTEGER NOT NULL DEFAULT 10,
          settings JSONB NOT NULL DEFAULT '{}'::jsonb
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS superadmin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          hashed_password VARCHAR NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
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
            CREATE INDEX IF NOT EXISTS idx_{table}_org ON {table}(org_id)
            """
        )

    op.execute(
        """
        INSERT INTO organizations (name, slug)
        SELECT 'Основная организация', 'main'
        WHERE NOT EXISTS (
          SELECT 1 FROM organizations WHERE slug = 'main'
        )
        """
    )
    for table in _ORG_TABLES:
        op.execute(
            f"""
            UPDATE {table}
            SET org_id = (SELECT id FROM organizations WHERE slug = 'main')
            WHERE org_id IS NULL
            """
        )


def downgrade() -> None:
    for table in reversed(_ORG_TABLES):
        op.execute(f'DROP INDEX IF EXISTS idx_{table}_org')
        op.execute(f'ALTER TABLE {table} DROP COLUMN IF EXISTS org_id')

    op.execute('DROP TABLE IF EXISTS superadmin_users')
    op.execute('DROP TABLE IF EXISTS organizations')
