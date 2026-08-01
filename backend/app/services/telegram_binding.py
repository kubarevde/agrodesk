"""Telegram ID binding invariants for employees.

Invariant: at most one active binding per telegram_id globally
(PostgreSQL UNIQUE on employees.telegram_id; NULL allowed many times).

Linking a TG ID that is already held by another row:
- default → ConflictError (409) — do not silently steal;
- force_transfer=True → clear previous holders, then assign (atomic).
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee


@dataclass
class TelegramConflict:
    employee_id: UUID
    employee_code: str
    full_name: str
    org_id: UUID | None


class TelegramBindError(Exception):
    """Raised when telegram_id is already bound and transfer was not requested."""

    def __init__(self, holders: list[TelegramConflict]) -> None:
        self.holders = holders
        if holders:
            h = holders[0]
            detail = (
                f'Этот Telegram ID уже привязан к сотруднику '
                f'{h.full_name} ({h.employee_code})'
            )
        else:
            detail = 'Этот Telegram ID уже привязан к другому сотруднику'
        super().__init__(detail)
        self.detail = detail


async def find_telegram_holders(
    db: AsyncSession,
    telegram_id: int,
    *,
    exclude_employee_id: UUID | None = None,
) -> list[Employee]:
    query = select(Employee).where(Employee.telegram_id == telegram_id)
    if exclude_employee_id is not None:
        query = query.where(Employee.id != exclude_employee_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def clear_telegram_from_others(
    db: AsyncSession,
    telegram_id: int,
    *,
    keep_employee_id: UUID,
) -> int:
    """Clear telegram_id on every other employee row (global). Returns rowcount."""
    result = await db.execute(
        update(Employee)
        .where(
            Employee.telegram_id == telegram_id,
            Employee.id != keep_employee_id,
        )
        .values(telegram_id=None)
    )
    return int(result.rowcount or 0)


async def assign_telegram_id(
    db: AsyncSession,
    employee: Employee,
    telegram_id: int | None,
    *,
    force_transfer: bool = False,
) -> list[TelegramConflict]:
    """Assign or clear telegram_id on ``employee``.

    Returns list of previous holders that were cleared when force_transfer=True.
    Raises TelegramBindError if taken and force_transfer is False.
    """
    if telegram_id is None:
        employee.telegram_id = None
        db.add(employee)
        return []

    holders = await find_telegram_holders(
        db, telegram_id, exclude_employee_id=employee.id
    )
    if holders and not force_transfer:
        raise TelegramBindError(
            [
                TelegramConflict(
                    employee_id=h.id,
                    employee_code=h.employee_code,
                    full_name=h.full_name,
                    org_id=h.org_id,
                )
                for h in holders
            ]
        )

    cleared: list[TelegramConflict] = []
    if holders:
        cleared = [
            TelegramConflict(
                employee_id=h.id,
                employee_code=h.employee_code,
                full_name=h.full_name,
                org_id=h.org_id,
            )
            for h in holders
        ]
        await clear_telegram_from_others(
            db, telegram_id, keep_employee_id=employee.id
        )

    employee.telegram_id = telegram_id
    db.add(employee)
    return cleared
