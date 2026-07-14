"""Create implements and implement_maintenance tables."""

from alembic import op


revision = '005_implements'
down_revision = '004_location_coords'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS implements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) UNIQUE NOT NULL,
          category VARCHAR(50) NOT NULL,
          serial_number VARCHAR(100),
          year_of_manufacture INTEGER,
          condition VARCHAR(30) NOT NULL DEFAULT 'good',
          description TEXT,
          image_url VARCHAR(500),
          current_equipment_id UUID REFERENCES equipment(id),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS implement_maintenance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          implement_id UUID REFERENCES implements(id) NOT NULL,
          date DATE NOT NULL,
          type VARCHAR(100) NOT NULL,
          cost NUMERIC(12,2),
          description TEXT,
          expense_id UUID REFERENCES expenses(id),
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS implement_maintenance CASCADE')
    op.execute('DROP TABLE IF EXISTS implements CASCADE')
