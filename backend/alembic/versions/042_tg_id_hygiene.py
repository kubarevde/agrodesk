"""Ensure telegram_id uniqueness hygiene (constraint already from 009).

Revision ID: 042_tg_id_hygiene
Revises: 041_mkt_inv_cat_map

- Re-assert UNIQUE(telegram_id) if missing (idempotent).
- Clear telegram_id on inactive employees so deactivated staff do not
  permanently reserve a Telegram account (bot-token already rejects inactive).
- If duplicate non-null telegram_id rows somehow exist (pre-constraint data),
  keep the earliest created_at / lowest id and NULL the rest so UNIQUE can apply.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = '042_tg_id_hygiene'
down_revision: Union[str, None] = '041_mkt_inv_cat_map'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Resolve duplicate non-null telegram_id (should be empty if 009 applied).
    conn.execute(
        text(
            """
            WITH ranked AS (
              SELECT id,
                     ROW_NUMBER() OVER (
                       PARTITION BY telegram_id
                       ORDER BY created_at ASC NULLS LAST, id ASC
                     ) AS rn
              FROM employees
              WHERE telegram_id IS NOT NULL
            )
            UPDATE employees e
            SET telegram_id = NULL
            FROM ranked r
            WHERE e.id = r.id AND r.rn > 1
            """
        )
    )

    # 2) Inactive employees must not keep a live Telegram binding.
    conn.execute(
        text(
            """
            UPDATE employees
            SET telegram_id = NULL
            WHERE is_active = false AND telegram_id IS NOT NULL
            """
        )
    )

    # 3) Ensure UNIQUE constraint exists (Postgres; IF NOT EXISTS via catalog check).
    conn.execute(
        text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'employees_telegram_id_key'
              ) THEN
                ALTER TABLE employees
                  ADD CONSTRAINT employees_telegram_id_key UNIQUE (telegram_id);
              END IF;
            END $$;
            """
        )
    )


def downgrade() -> None:
    # Do not drop UNIQUE — it predates this revision (009).
    # Do not restore cleared telegram_id values (irreversible hygiene).
    pass
