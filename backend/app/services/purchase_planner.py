"""Purchase planner business rules."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeRole
from app.models.expense import Expense
from app.models.purchase_planner import PurchasePlannerItem
from app.services.audit import log_change, model_snapshot

MANAGER_ROLES = frozenset({EmployeeRole.manager, EmployeeRole.admin})

EMPLOYEE_PATCH_FIELDS = frozenset({
    'status',
    'actual_cost',
    'notes',
    'purchase_place',
    'images',
})


def is_manager(employee: Employee) -> bool:
    return employee.role in MANAGER_ROLES


def assert_employee_may_patch(row: PurchasePlannerItem, updates: dict) -> None:
    extra = set(updates) - EMPLOYEE_PATCH_FIELDS
    if extra:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав для изменения этих полей',
        )

    new_status = updates.get('status')
    if new_status == 'cancelled':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Отмена закупки доступна только руководителю',
        )
    if new_status == 'planned' and row.status == 'purchased':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Возврат статуса доступен только руководителю',
        )
    if new_status is not None and new_status != 'purchased':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Сотрудник может только отметить закупку как купленную',
        )
    if new_status == 'purchased' and row.status != 'planned':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Можно отметить купленным только позицию «к покупке»',
        )


async def unlink_purchase_expense(
    db: AsyncSession,
    *,
    org_id: UUID,
    row: PurchasePlannerItem,
    changed_by: UUID,
) -> None:
    if row.expense_id is None:
        return
    expense = await db.get(Expense, row.expense_id)
    if expense is None or expense.org_id != org_id:
        row.expense_id = None
        return
    before = model_snapshot(expense)
    await log_change(
        db,
        org_id=org_id,
        entity_type='expense',
        entity_id=expense.id,
        action='delete',
        changed_by=changed_by,
        before=before,
        summary=f'Удалён расход при откате закупки: {row.title}',
    )
    await db.delete(expense)
    row.expense_id = None


async def apply_status_side_effects(
    db: AsyncSession,
    *,
    org_id: UUID,
    row: PurchasePlannerItem,
    previous_status: str,
    new_status: str | None,
    changed_by: UUID,
) -> None:
    if new_status == 'purchased' and row.purchased_at is None:
        row.purchased_at = datetime.now(timezone.utc)

    if new_status == 'planned' and previous_status == 'purchased':
        row.purchased_at = None
        row.actual_cost = None
        await unlink_purchase_expense(db, org_id=org_id, row=row, changed_by=changed_by)


def normalize_images(value: list[str] | None) -> list[str]:
    if not value:
        return []
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        url = item.strip()
        if url and url not in cleaned:
            cleaned.append(url)
    return cleaned[:5]


def expense_amount_for_purchase(row: PurchasePlannerItem) -> Decimal | None:
    amount = row.actual_cost if row.actual_cost is not None else row.estimated_cost
    if amount is None:
        return None
    dec = Decimal(str(amount))
    return dec if dec > 0 else None
