"""Agro plan admin/manual close audit: closed_by, closed_at, close_note.

Revision ID: 023_agro_plan_closed_by
Revises: 022_agro_calendar_shift_link
"""

from alembic import op

revision = '023_agro_plan_closed_by'
down_revision = '022_agro_calendar_shift_link'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE agro_plan
        ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES employees(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        ALTER TABLE agro_plan
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ
        """
    )
    op.execute(
        """
        ALTER TABLE agro_plan
        ADD COLUMN IF NOT EXISTS close_note TEXT
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_agro_plan_closed_by
          ON agro_plan (closed_by)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_agro_plan_closed_by')
    op.execute('ALTER TABLE agro_plan DROP COLUMN IF EXISTS close_note')
    op.execute('ALTER TABLE agro_plan DROP COLUMN IF EXISTS closed_at')
    op.execute('ALTER TABLE agro_plan DROP COLUMN IF EXISTS closed_by')
