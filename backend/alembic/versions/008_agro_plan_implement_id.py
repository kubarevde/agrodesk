"""Add implement_id to agro_plan."""

from alembic import op


revision = '008_agro_plan_implement_id'
down_revision = '007_sharing_implement_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE agro_plan
          ADD COLUMN IF NOT EXISTS implement_id UUID REFERENCES implements(id)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE agro_plan
          DROP COLUMN IF EXISTS implement_id
        """
    )
