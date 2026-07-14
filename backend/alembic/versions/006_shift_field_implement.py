"""Add field_id and implement_id to shifts."""

from alembic import op


revision = '006_shift_field_implement'
down_revision = '005_implements'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE shifts
          ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES locations(id),
          ADD COLUMN IF NOT EXISTS implement_id UUID REFERENCES implements(id)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE shifts
          DROP COLUMN IF EXISTS implement_id,
          DROP COLUMN IF EXISTS field_id
        """
    )
