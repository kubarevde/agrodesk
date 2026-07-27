"""Shift delete FK safety: SET NULL on agro_plan.actual_shift_id and meter logs.

Revision ID: 024_shift_delete_fk
Revises: 023_agro_plan_closed_by
"""

from alembic import op

revision = '024_shift_delete_fk'
down_revision = '023_agro_plan_closed_by'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop and recreate FKs with ON DELETE SET NULL so hard-delete of shifts is safe.
    op.execute(
        """
        DO $$
        DECLARE
          con_name text;
        BEGIN
          SELECT tc.constraint_name INTO con_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'agro_plan'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'actual_shift_id'
          LIMIT 1;
          IF con_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE agro_plan DROP CONSTRAINT %I', con_name);
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        ALTER TABLE agro_plan
        ADD CONSTRAINT agro_plan_actual_shift_id_fkey
        FOREIGN KEY (actual_shift_id) REFERENCES shifts(id) ON DELETE SET NULL
        """
    )

    op.execute(
        """
        DO $$
        DECLARE
          con_name text;
        BEGIN
          SELECT tc.constraint_name INTO con_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'equipment_meter_logs'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'shift_id'
          LIMIT 1;
          IF con_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE equipment_meter_logs DROP CONSTRAINT %I', con_name);
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        ALTER TABLE equipment_meter_logs
        ADD CONSTRAINT equipment_meter_logs_shift_id_fkey
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
        """
    )


def downgrade() -> None:
    op.execute('ALTER TABLE equipment_meter_logs DROP CONSTRAINT IF EXISTS equipment_meter_logs_shift_id_fkey')
    op.execute(
        """
        ALTER TABLE equipment_meter_logs
        ADD CONSTRAINT equipment_meter_logs_shift_id_fkey
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
        """
    )
    op.execute('ALTER TABLE agro_plan DROP CONSTRAINT IF EXISTS agro_plan_actual_shift_id_fkey')
    op.execute(
        """
        ALTER TABLE agro_plan
        ADD CONSTRAINT agro_plan_actual_shift_id_fkey
        FOREIGN KEY (actual_shift_id) REFERENCES shifts(id)
        """
    )
