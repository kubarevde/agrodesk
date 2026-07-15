"""Add employee_rates, telegram_id, shift pay fields."""

from alembic import op


revision = '009_employee_rates'
down_revision = '008_agro_plan_implement_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS employee_rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id),
          work_type_id UUID REFERENCES work_types(id),
          rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
          overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
          overtime_threshold_hours NUMERIC(4,1) NOT NULL DEFAULT 8.0,
          valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
          valid_to DATE,
          notes TEXT,
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_rate_period
          ON employee_rates (employee_id, work_type_id, valid_from)
          WHERE valid_to IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE employees
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'employees_telegram_id_key'
          ) THEN
            ALTER TABLE employees
              ADD CONSTRAINT employees_telegram_id_key UNIQUE (telegram_id);
          END IF;
        END
        $$
        """
    )
    op.execute(
        """
        ALTER TABLE shifts
          ADD COLUMN IF NOT EXISTS calculated_amount NUMERIC(10,2)
        """
    )
    op.execute(
        """
        ALTER TABLE shifts
          ADD COLUMN IF NOT EXISTS rate_snapshot JSONB
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE shifts
          DROP COLUMN IF EXISTS rate_snapshot,
          DROP COLUMN IF EXISTS calculated_amount
        """
    )
    op.execute(
        """
        ALTER TABLE employees
          DROP CONSTRAINT IF EXISTS employees_telegram_id_key
        """
    )
    op.execute(
        """
        ALTER TABLE employees
          DROP COLUMN IF EXISTS telegram_id
        """
    )
    op.execute('DROP INDEX IF EXISTS uq_employee_rate_period')
    op.execute('DROP TABLE IF EXISTS employee_rates CASCADE')
