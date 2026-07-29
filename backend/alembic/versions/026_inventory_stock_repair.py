"""Restore missing opening balances and recalculate inventory stock.

Revision ID: 026_inventory_stock_repair
Revises: 025_access_groups

Cause (021 hole): opening ops were inserted only for items with stock AND zero
operations. Items that already had movements lost their implicit starting stock
when current_stock was rewritten from ops alone — timelines went negative and
income posts then failed the shared insufficient-stock check.

Repair (idempotent):
- Never delete existing operations.
- For each item without purpose='opening': compute the minimum opening income
  that keeps the running balance >= 0; insert that opening if > 0.
- For items with current_stock > 0 and no ops at all: insert opening = current_stock.
- Recalculate stock_after + current_stock for every item.
- Log each change (item id, name, old→new stock, opening qty).
"""

from __future__ import annotations

import logging
from decimal import Decimal
from uuid import uuid4

from alembic import op
from sqlalchemy import text

revision = '026_inventory_stock_repair'
down_revision = '025_access_groups'
branch_labels = None
depends_on = None

logger = logging.getLogger('alembic.runtime.migration')


def _delta(op_type: str, qty: Decimal) -> Decimal:
    return qty if op_type == 'income' else -qty


def _min_opening(rows: list[tuple[str, Decimal]]) -> Decimal:
    balance = Decimal('0')
    min_balance = Decimal('0')
    for op_type, qty in rows:
        balance += _delta(op_type, qty)
        if balance < min_balance:
            min_balance = balance
    if min_balance >= 0:
        return Decimal('0')
    return -min_balance


def _recalculate_item(conn, item_id: str) -> Decimal:
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

    balance = Decimal('0')
    for op_id, op_type, qty in rows:
        balance += _delta(op_type, Decimal(str(qty)))
        conn.execute(
            text('UPDATE inventory_operations SET stock_after = :balance WHERE id = :id'),
            {'balance': float(balance), 'id': op_id},
        )

    conn.execute(
        text('UPDATE inventory_items SET current_stock = :balance WHERE id = :id'),
        {'balance': float(balance), 'id': item_id},
    )
    return balance


def upgrade() -> None:
    conn = op.get_bind()
    items = conn.execute(
        text('SELECT id, name, current_stock FROM inventory_items ORDER BY name')
    ).fetchall()

    repaired = 0
    for item_id, name, old_stock in items:
        item_id_s = str(item_id)
        has_opening = conn.execute(
            text(
                """
                SELECT 1 FROM inventory_operations
                WHERE item_id = :item_id AND purpose = 'opening'
                LIMIT 1
                """
            ),
            {'item_id': item_id},
        ).fetchone()

        ops = conn.execute(
            text(
                """
                SELECT type::text, quantity
                FROM inventory_operations
                WHERE item_id = :item_id AND purpose <> 'opening'
                ORDER BY date ASC, created_at ASC, id ASC
                """
            ),
            {'item_id': item_id},
        ).fetchall()

        opening_qty = Decimal('0')
        if has_opening is None:
            if not ops:
                # Mirror 021: persist denormalized stock as opening when no history.
                stock = Decimal(str(old_stock or 0))
                if stock > 0:
                    opening_qty = stock
            else:
                rows = [(t, Decimal(str(q))) for t, q in ops]
                opening_qty = _min_opening(rows)

            if opening_qty > 0:
                conn.execute(
                    text(
                        """
                        INSERT INTO inventory_operations (
                          id, date, item_id, type, quantity, stock_after,
                          reason, purpose, created_at
                        ) VALUES (
                          :id, DATE '1900-01-01', :item_id, 'income', :qty, :qty,
                          'Начальный остаток (восстановление)', 'opening', now()
                        )
                        """
                    ),
                    {
                        'id': str(uuid4()),
                        'item_id': item_id,
                        'qty': float(opening_qty),
                    },
                )
                repaired += 1
                logger.info(
                    'inventory repair: item=%s name=%r inserted opening=%s (old_stock=%s)',
                    item_id_s,
                    name,
                    opening_qty,
                    old_stock,
                )

        new_stock = _recalculate_item(conn, item_id_s)
        if Decimal(str(old_stock or 0)) != new_stock:
            logger.info(
                'inventory repair: item=%s name=%r current_stock %s -> %s',
                item_id_s,
                name,
                old_stock,
                new_stock,
            )

    logger.info('inventory repair complete: openings_inserted=%s items=%s', repaired, len(items))


def downgrade() -> None:
    # Remove only openings created by this repair (distinct reason text).
    # Does not delete user history or openings from 021 / create-item flow.
    op.execute(
        """
        DELETE FROM inventory_operations
        WHERE purpose = 'opening'
          AND reason = 'Начальный остаток (восстановление)'
        """
    )
    # Recalculate after removal so stock matches remaining ledger.
    conn = op.get_bind()
    item_ids = conn.execute(text('SELECT id FROM inventory_items')).fetchall()
    for (item_id,) in item_ids:
        _recalculate_item(conn, str(item_id))
