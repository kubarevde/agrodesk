"""Add implement_id to sharing_listings."""

from alembic import op


revision = '007_sharing_implement_id'
down_revision = '006_shift_field_implement'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sharing_listings
          ADD COLUMN IF NOT EXISTS implement_id UUID REFERENCES implements(id)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE sharing_listings
          DROP COLUMN IF EXISTS implement_id
        """
    )
