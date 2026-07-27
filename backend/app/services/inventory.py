"""Inventory stock balance and operation posting."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

OPENING_BALANCE_DATE = date(1900, 1, 1)

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, InventoryOperation, InventoryOperationType


def assert_operation_date(op_date: date) -> None:
    if op_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Дата операции не может быть в будущем',
        )


def _operation_delta(op_type: InventoryOperationType, quantity: Decimal) -> Decimal:
    if op_type == InventoryOperationType.income:
        return quantity
    return -quantity


async def recalculate_item_stock(db: AsyncSession, item: InventoryItem) -> Decimal:
    """Recompute stock_after for all item operations and sync current_stock."""
    result = await db.execute(
        select(InventoryOperation)
        .where(InventoryOperation.item_id == item.id)
        .order_by(
            InventoryOperation.date.asc(),
            InventoryOperation.created_at.asc(),
            InventoryOperation.id.asc(),
        )
    )
    operations = result.scalars().all()
    balance = Decimal('0')
    for operation in operations:
        balance += _operation_delta(operation.type, Decimal(str(operation.quantity)))
        if balance < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Недостаточно запасов на выбранную дату',
            )
        operation.stock_after = balance
        db.add(operation)

    item.current_stock = balance
    db.add(item)
    return balance


async def create_inventory_operation(
    db: AsyncSession,
    *,
    item: InventoryItem,
    op_type: InventoryOperationType,
    quantity: Decimal,
    op_date: date | None,
    created_by: UUID,
    reason: str | None = None,
    supplier: str | None = None,
    cost: Decimal | None = None,
    equipment_id: UUID | None = None,
    purpose: str = 'general',
) -> InventoryOperation:
    effective_date = op_date or date.today()
    assert_operation_date(effective_date)

    operation = InventoryOperation(
        date=effective_date,
        item_id=item.id,
        type=op_type,
        quantity=quantity,
        stock_after=Decimal('0'),
        reason=reason,
        supplier=supplier,
        cost=cost,
        created_by=created_by,
        equipment_id=equipment_id,
        purpose=purpose,
    )
    db.add(operation)
    await db.flush()
    await recalculate_item_stock(db, item)
    await db.flush()
    return operation


async def create_opening_balance_operation(
    db: AsyncSession,
    *,
    item: InventoryItem,
    created_by: UUID | None,
) -> InventoryOperation | None:
    quantity = Decimal(str(item.current_stock))
    if quantity <= 0:
        return None

    operation = InventoryOperation(
        date=OPENING_BALANCE_DATE,
        item_id=item.id,
        type=InventoryOperationType.income,
        quantity=quantity,
        stock_after=quantity,
        reason='Начальный остаток',
        purpose='opening',
        created_by=created_by,
    )
    db.add(operation)
    await db.flush()
    return operation
