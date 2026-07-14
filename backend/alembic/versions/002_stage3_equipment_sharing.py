"""stage3 equipment sharing agro schema

Revision ID: 002_stage3
Revises: ca84ef64c25e
Create Date: 2026-07-14 12:16:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '002_stage3'
down_revision: Union[str, None] = 'ca84ef64c25e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    # --- equipment columns ---
    op.execute(
        """
        ALTER TABLE equipment
          ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER,
          ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
          ADD COLUMN IF NOT EXISTS meter_type VARCHAR(20) DEFAULT 'motohours',
          ADD COLUMN IF NOT EXISTS current_meter NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS to_interval NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS next_to_at NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
          ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
          ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
          ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES employees(id)
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'equipment_meter_type_check'
          ) THEN
            ALTER TABLE equipment
              ADD CONSTRAINT equipment_meter_type_check
              CHECK (meter_type IS NULL OR meter_type IN ('motohours', 'km', 'shift_hours'));
          END IF;
        END $$
        """
    )
    op.execute(
        """
        UPDATE equipment
        SET meter_type = 'motohours'
        WHERE meter_type IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE equipment
          ALTER COLUMN meter_type SET DEFAULT 'motohours'
        """
    )

    # --- locations columns ---
    op.execute(
        """
        ALTER TABLE locations
          ADD COLUMN IF NOT EXISTS area_ha NUMERIC(8,2),
          ADD COLUMN IF NOT EXISTS polygon JSONB,
          ADD COLUMN IF NOT EXISTS crop_type VARCHAR(100),
          ADD COLUMN IF NOT EXISTS soil_type VARCHAR(100)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS equipment_meter_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          equipment_id UUID REFERENCES equipment(id) NOT NULL,
          shift_id UUID REFERENCES shifts(id),
          date DATE NOT NULL,
          value_added NUMERIC(10,2) NOT NULL,
          meter_after NUMERIC(10,2) NOT NULL,
          note TEXT,
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS equipment_maintenance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          equipment_id UUID REFERENCES equipment(id) NOT NULL,
          date DATE NOT NULL,
          type VARCHAR(100) NOT NULL,
          meter_at NUMERIC(10,2),
          cost NUMERIC(12,2),
          description TEXT,
          next_to_at NUMERIC(10,2),
          expense_id UUID REFERENCES expenses(id),
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sharing_listings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          price_per_unit NUMERIC(12,2),
          price_unit VARCHAR(50),
          location_id UUID REFERENCES locations(id),
          equipment_id UUID REFERENCES equipment(id),
          owner_id UUID REFERENCES employees(id) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          latitude NUMERIC(9,6),
          longitude NUMERIC(9,6),
          region VARCHAR(100),
          contact_info TEXT,
          images JSONB,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sharing_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          listing_id UUID REFERENCES sharing_listings(id) NOT NULL,
          requester_id UUID REFERENCES employees(id) NOT NULL,
          message TEXT,
          desired_from DATE,
          desired_to DATE,
          status VARCHAR(20) DEFAULT 'pending',
          owner_response TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(200) NOT NULL,
          body TEXT,
          link VARCHAR(200),
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS agro_plan (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          location_id UUID REFERENCES locations(id) NOT NULL,
          work_type_id UUID REFERENCES work_types(id) NOT NULL,
          planned_date DATE NOT NULL,
          planned_end_date DATE,
          equipment_id UUID REFERENCES equipment(id),
          employee_id UUID REFERENCES employees(id),
          notes TEXT,
          status VARCHAR(20) DEFAULT 'planned',
          actual_shift_id UUID REFERENCES shifts(id),
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS agro_plan CASCADE')
    op.execute('DROP TABLE IF EXISTS notifications CASCADE')
    op.execute('DROP TABLE IF EXISTS sharing_requests CASCADE')
    op.execute('DROP TABLE IF EXISTS sharing_listings CASCADE')
    op.execute('DROP TABLE IF EXISTS equipment_maintenance CASCADE')
    op.execute('DROP TABLE IF EXISTS equipment_meter_logs CASCADE')

    op.execute(
        """
        ALTER TABLE locations
          DROP COLUMN IF EXISTS soil_type,
          DROP COLUMN IF EXISTS crop_type,
          DROP COLUMN IF EXISTS polygon,
          DROP COLUMN IF EXISTS area_ha
        """
    )
    op.execute('ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_meter_type_check')
    op.execute(
        """
        ALTER TABLE equipment
          DROP COLUMN IF EXISTS owner_id,
          DROP COLUMN IF EXISTS image_url,
          DROP COLUMN IF EXISTS longitude,
          DROP COLUMN IF EXISTS latitude,
          DROP COLUMN IF EXISTS next_to_at,
          DROP COLUMN IF EXISTS to_interval,
          DROP COLUMN IF EXISTS current_meter,
          DROP COLUMN IF EXISTS meter_type,
          DROP COLUMN IF EXISTS serial_number,
          DROP COLUMN IF EXISTS year_of_manufacture
        """
    )
