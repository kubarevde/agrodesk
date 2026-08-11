"""Per-employee notification type preferences (existing types only)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.employee import Employee
from app.models.notification import Notification

# Stable keys = Notification.type values already used in the product.
NOTIFICATION_TYPE_DEFS: tuple[tuple[str, str], ...] = (
    ('to_due', 'ТО скоро (приближение к плану)'),
    ('to_overdue', 'ТО просрочено'),
    ('maintenance_done', 'ТО выполнено'),
    ('sharing_request', 'Новая заявка шеринга'),
    ('sharing_accepted', 'Заявка шеринга принята'),
    ('sharing_rejected', 'Заявка шеринга отклонена'),
    ('new_message', 'Новое сообщение в мессенджере'),
    ('support_reply', 'Ответ поддержки'),
    ('new_market_order', 'Новый заказ на витрине'),
    ('marketplace_moderation', 'Модерация объявления на витрине'),
)

NOTIFICATION_TYPE_KEYS: frozenset[str] = frozenset(key for key, _ in NOTIFICATION_TYPE_DEFS)


def prefs_dict(raw: Any) -> dict[str, bool]:
    if not isinstance(raw, dict):
        return {}
    out: dict[str, bool] = {}
    for key, value in raw.items():
        if key not in NOTIFICATION_TYPE_KEYS:
            continue
        if isinstance(value, bool):
            out[key] = value
        elif isinstance(value, str):
            out[key] = value.strip().lower() not in {'0', 'false', 'no', 'off'}
        else:
            out[key] = bool(value)
    return out


def is_type_enabled(prefs: Any, notif_type: str) -> bool:
    """Absent key → enabled (backward compatible)."""
    if notif_type not in NOTIFICATION_TYPE_KEYS:
        return True
    stored = prefs_dict(prefs)
    if notif_type not in stored:
        return True
    return bool(stored[notif_type])


def catalog_with_state(prefs: Any) -> list[dict[str, Any]]:
    stored = prefs_dict(prefs)
    return [
        {
            'type': key,
            'label': label,
            'enabled': stored.get(key, True),
        }
        for key, label in NOTIFICATION_TYPE_DEFS
    ]


def merge_prefs_update(current: Any, updates: dict[str, bool]) -> dict[str, bool]:
    merged = prefs_dict(current)
    for key, value in updates.items():
        if key not in NOTIFICATION_TYPE_KEYS:
            continue
        merged[key] = bool(value)
    return merged


async def create_employee_notification(
    db: AsyncSession,
    *,
    employee_id: UUID,
    notif_type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    prefs: Any | None = None,
) -> Notification | None:
    """Insert inbox notification if the employee enabled this type. Returns row or None."""
    if prefs is None:
        employee = await db.get(Employee, employee_id)
        prefs = employee.notification_prefs if employee is not None else {}
    if not is_type_enabled(prefs, notif_type):
        return None
    row = Notification(
        employee_id=employee_id,
        type=notif_type,
        title=title,
        body=body,
        link=link,
        is_read=False,
    )
    db.add(row)
    return row


async def load_employee_prefs_map(
    db: AsyncSession,
    employee_ids: list[UUID],
) -> dict[UUID, Any]:
    if not employee_ids:
        return {}
    result = await db.execute(
        select(Employee.id, Employee.notification_prefs).where(Employee.id.in_(employee_ids))
    )
    return {row.id: row.notification_prefs for row in result.all()}


async def save_employee_prefs(
    db: AsyncSession,
    employee: Employee,
    updates: dict[str, bool],
) -> dict[str, bool]:
    merged = merge_prefs_update(employee.notification_prefs, updates)
    employee.notification_prefs = merged
    flag_modified(employee, 'notification_prefs')
    db.add(employee)
    await db.flush()
    return merged
