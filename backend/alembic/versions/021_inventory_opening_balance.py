"""Backfill opening-balance operations and recalculate stock_after.

Revision ID: 021_inventory_opening_balance
Revises: 020_purchase_planner_images
"""

from alembic import op
from sqlalchemy import text

revision = '021_inventory_opening_balance'
down_revision = '020_purchase_planner_images'
branch_labels = None
depends_on = None


def _recalculate_item(conn, item_id: str) -> None:
    rows = conn.execute(
        text(
            """
            SELECT id, type::text, quantity
            FROM inventory_operations
            WHERE item_id = :item_id
            ORDER BY date ASC, created_at ASC, id ASC
            """
        ),
        {'item_id': item_id},
    ).fetchall()

    balance = 0.0
    for op_id, op_type, qty in rows:
        delta = float(qty) if op_type == 'income' else -float(qty)
        balance += delta
        conn.execute(
            text('UPDATE inventory_operations SET stock_after = :balance WHERE id = :id'),
            {'balance': balance, 'id': op_id},
        )

    conn.execute(
        text('UPDATE inventory_items SET current_stock = :balance WHERE id = :id'),
        {'balance': balance, 'id': item_id},
    )


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            INSERT INTO inventory_operations (
              id, date, item_id, type, quantity, stock_after, reason, purpose, created_at
            )
            SELECT
              gen_random_uuid(),
              DATE '1900-01-01',
              i.id,
              'income',
              i.current_stock,
              i.current_stock,
              'Начальный остаток',
              'opening',
              now()
            FROM inventory_items i
            WHERE i.current_stock > 0
              AND NOT EXISTS (
                SELECT 1 FROM inventory_operations o WHERE o.item_id = i.id
              )
            """
        )
    )

    item_ids = conn.execute(text('SELECT id FROM inventory_items')).fetchall()
    for (item_id,) in item_ids:
        _recalculate_item(conn, str(item_id))


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM inventory_operations
        WHERE purpose = 'opening' AND reason = 'Начальный остаток'
        """
    )
