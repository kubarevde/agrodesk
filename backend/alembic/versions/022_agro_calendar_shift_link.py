"""Agro calendar ↔ shifts: field-work flag, plan/fact kind, shift.agro_plan_id.

Revision ID: 022_agro_calendar_shift_link
Revises: 021_inventory_opening_balance
"""

from alembic import op

revision = '022_agro_calendar_shift_link'
down_revision = '021_inventory_opening_balance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE work_types
        ADD COLUMN IF NOT EXISTS is_field_work BOOLEAN NOT NULL DEFAULT false
        """
    )
    # Heuristic backfill from existing category / known field work names
    op.execute(
        """
        UPDATE work_types
        SET is_field_work = true
        WHERE is_field_work = false
          AND (
            category ILIKE '%поле%'
            OR name IN (
              'Посев', 'Уборка урожая', 'Культивация', 'Боронование',
              'Опрыскивание', 'Полив', 'Пахота'
            )
          )
        """
    )

    op.execute(
        """
        ALTER TABLE agro_plan
        ADD COLUMN IF NOT EXISTS entry_kind VARCHAR(20) NOT NULL DEFAULT 'plan'
        """
    )
    op.execute(
        """
        UPDATE agro_plan
        SET entry_kind = 'plan'
        WHERE entry_kind IS NULL OR entry_kind = ''
        """
    )

    op.execute(
        """
        ALTER TABLE shifts
        ADD COLUMN IF NOT EXISTS agro_plan_id UUID REFERENCES agro_plan(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_shifts_agro_plan_id
          ON shifts (agro_plan_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_agro_plan_entry_kind
          ON agro_plan (entry_kind)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_agro_plan_entry_kind')
    op.execute('DROP INDEX IF EXISTS idx_shifts_agro_plan_id')
    op.execute('ALTER TABLE shifts DROP COLUMN IF EXISTS agro_plan_id')
    op.execute('ALTER TABLE agro_plan DROP COLUMN IF EXISTS entry_kind')
    op.execute('ALTER TABLE work_types DROP COLUMN IF EXISTS is_field_work')
