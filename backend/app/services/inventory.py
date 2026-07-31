"""Inventory stock balance and operation posting.

Canonical model (single source of truth):
- Operations are the ledger (income +, expense -).
- Opening balance is an income op with purpose='opening' at 1900-01-01.
- Adjustments use purpose='adjustment' (income or expense) with required reason.
- InventoryItem.current_stock is denormalized and always rewritten by recalculate_item_stock.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, InventoryOperation, InventoryOperationType

OPENING_BALANCE_DATE = date(1900, 1, 1)
PURPOSE_OPENING = 'opening'
PURPOSE_ADJUSTMENT = 'adjustment'
PURPOSE_GENERAL = 'general'
PURPOSE_SHIPMENT_REQUEST = 'shipment_request'
PURPOSE_HARVEST_INCOME = 'harvest_income'


def assert_operation_date(op_date: date) -> None:
    if op_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Дата операции не может быть в будущем',
        )


def _operation_delta(op_type: InventoryOperationType | str, quantity: Decimal) -> Decimal:
    value = op_type.value if isinstance(op_type, InventoryOperationType) else str(op_type)
    if value == InventoryOperationType.income.value:
        return quantity
    return -quantity


def compute_running_balances(
    operations: list[InventoryOperation],
) -> list[tuple[InventoryOperation, Decimal]]:
    balance = Decimal('0')
    rows: list[tuple[InventoryOperation, Decimal]] = []
    for operation in operations:
        balance += _operation_delta(operation.type, Decimal(str(operation.quantity)))
        rows.append((operation, balance))
    return rows


async def load_item_operations_ordered(
    db: AsyncSession, item_id: UUID
) -> list[InventoryOperation]:
    result = await db.execute(
        select(InventoryOperation)
        .where(InventoryOperation.item_id == item_id)
        .order_by(
            InventoryOperation.date.asc(),
            InventoryOperation.created_at.asc(),
            InventoryOperation.id.asc(),
        )
    )
    return list(result.scalars().all())


async def recalculate_item_stock(
    db: AsyncSession,
    item: InventoryItem,
    *,
    allow_negative: bool = False,
    failing_hint: tuple[Decimal, Decimal] | None = None,
) -> Decimal:
    """Recompute stock_after for all item operations and sync current_stock.

    allow_negative=True is used for income posts so a broken pre-021 ledger
    cannot block receiving stock; expense posts keep allow_negative=False.
    """
    operations = await load_item_operations_ordered(db, item.id)
    balance = Decimal('0')
    for operation in operations:
        qty = Decimal(str(operation.quantity))
        before = balance
        balance += _operation_delta(operation.type, qty)
        if not allow_negative and balance < 0:
            available = before
            requested = qty
            if failing_hint is not None:
                available, requested = failing_hint
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'Недостаточно запасов: доступно {available}, '
                    f'запрошено {requested}'
                ),
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
    purpose: str = PURPOSE_GENERAL,
    field_id: UUID | None = None,
) -> InventoryOperation:
    effective_date = op_date or date.today()
    assert_operation_date(effective_date)
    qty = Decimal(str(quantity))
    if qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Количество должно быть больше 0',
        )

    purpose_norm = (purpose or PURPOSE_GENERAL).strip() or PURPOSE_GENERAL
    if purpose_norm == PURPOSE_ADJUSTMENT and not (reason or '').strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для корректировки укажите причину',
        )

    resolved_field_id = field_id
    if purpose_norm == PURPOSE_HARVEST_INCOME:
        if op_type != InventoryOperationType.income:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сбор урожая оформляется только как приход',
            )
        if resolved_field_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Для сбора урожая укажите поле (field_id)',
            )
    elif resolved_field_id is not None and purpose_norm != PURPOSE_HARVEST_INCOME:
        # Ignore stray field_id on non-harvest purposes (no parallel semantics).
        resolved_field_id = None

    # Expense / write-off: refuse if stock at posting date is insufficient.
    # Income must never hit this gate (observed bug: shared insufficient check).
    available_at_date = Decimal('0')
    if op_type == InventoryOperationType.expense:
        ops = await load_item_operations_ordered(db, item.id)
        preview = Decimal('0')
        for existing in ops:
            if existing.date < effective_date:
                preview += _operation_delta(existing.type, Decimal(str(existing.quantity)))
            elif existing.date == effective_date:
                preview += _operation_delta(existing.type, Decimal(str(existing.quantity)))
            else:
                break
        available_at_date = preview
        if qty > available_at_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'Недостаточно запасов: доступно {available_at_date}, '
                    f'запрошено {qty}'
                ),
            )

    operation = InventoryOperation(
        date=effective_date,
        item_id=item.id,
        type=op_type,
        quantity=qty,
        stock_after=Decimal('0'),
        reason=reason,
        supplier=supplier,
        cost=cost,
        created_by=created_by,
        equipment_id=equipment_id,
        purpose=purpose_norm,
        field_id=resolved_field_id,
    )
    db.add(operation)
    await db.flush()
    await recalculate_item_stock(
        db,
        item,
        allow_negative=(op_type == InventoryOperationType.income),
        failing_hint=(available_at_date, qty)
        if op_type == InventoryOperationType.expense
        else None,
    )
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
        purpose=PURPOSE_OPENING,
        created_by=created_by,
    )
    db.add(operation)
    await db.flush()
    return operation


def min_opening_to_keep_non_negative(
    op_rows: list[tuple[str, Decimal]],
) -> Decimal:
    """Smallest opening income that keeps running balance >= 0 for (type, qty) rows."""
    balance = Decimal('0')
    min_balance = Decimal('0')
    for op_type, qty in op_rows:
        balance += _operation_delta(op_type, qty)
        if balance < min_balance:
            min_balance = balance
    if min_balance >= 0:
        return Decimal('0')
    return -min_balance


def ledger_final_balance(op_rows: list[tuple[str, Decimal]]) -> Decimal:
    """Final balance after applying (type, qty) rows in chronological order."""
    balance = Decimal('0')
    for op_type, qty in op_rows:
        balance += _operation_delta(op_type, qty)
    return balance


def assert_non_negative_timeline(op_rows: list[tuple[str, Decimal]]) -> None:
    """Raise ValueError if any prefix of the ledger goes below zero."""
    balance = Decimal('0')
    for index, (op_type, qty) in enumerate(op_rows):
        balance += _operation_delta(op_type, qty)
        if balance < 0:
            raise ValueError(
                f'Остаток уходит в минус после операции #{index + 1}: баланс={balance}'
            )
