"""Purchase planner item photos.

Revision ID: 020_purchase_planner_images
Revises: 019_purchase_maintenance_link
"""

from alembic import op

revision = '020_purchase_planner_images'
down_revision = '019_purchase_maintenance_link'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE purchase_planner_items
        ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE purchase_planner_items
        DROP COLUMN IF EXISTS images
        """
    )
