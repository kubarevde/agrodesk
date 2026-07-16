"""Shared helpers for maintenance → expense side-effects."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense

# Default dictionary code for maintenance-linked expenses (seed expense_category).
MAINTENANCE_EXPENSE_CATEGORY = 'parts'


def should_create_maintenance_expense(cost: float | Decimal | None) -> bool:
    if cost is None:
        return False
    return Decimal(str(cost)) > 0


async def create_maintenance_expense(
    db: AsyncSession,
    *,
    org_id: UUID,
    expense_date: date,
    amount: float | Decimal,
    description: str,
    created_by: UUID | None,
    equipment_id: UUID | None = None,
) -> Expense:
    """Create an Expense linked to a maintenance record. Caller must flush/commit."""
    expense = Expense(
        org_id=org_id,
        date=expense_date,
        category=MAINTENANCE_EXPENSE_CATEGORY,
        amount=Decimal(str(amount)),
        description=description,
        equipment_id=equipment_id,
        created_by=created_by,
    )
    db.add(expense)
    await db.flush()
    return expense
