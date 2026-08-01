"""Inbox (+ optional Telegram) for new public marketplace orders.

Additive: uses Notification.type = 'new_market_order' (VARCHAR, no migration).
Does not mix public buyers into the employee messenger.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.notification import Notification
from app.services.action_permissions import (
    employee_has_action,
    resolve_effective_permissions,
)
from app.services.telegram_notify import format_new_market_order_telegram_text

logger = logging.getLogger(__name__)

NEW_MARKET_ORDER_TYPE = 'new_market_order'
SELLER_ORDERS_LINK = '/seller-market/orders'


async def list_employees_with_marketplace_manage(
    db: AsyncSession,
    org_id: UUID,
) -> list[Employee]:
    """Active org employees who may manage the seller cabinet."""
    employees = (
        await db.execute(
            select(Employee).where(
                Employee.org_id == org_id,
                Employee.is_active.is_(True),
            )
        )
    ).scalars().all()
    recipients: list[Employee] = []
    for employee in employees:
        effective = await resolve_effective_permissions(db, employee)
        if employee_has_action(effective, 'marketplace.manage'):
            recipients.append(employee)
    return recipients


async def notify_new_market_order(
    db: AsyncSession,
    *,
    org_id: UUID,
    listing_title: str,
    buyer_name: str,
    buyer_phone: str,
    quantity: Decimal,
    unit: str,
) -> list[UUID]:
    """One inbox row per eligible employee. Returns recipient employee ids."""
    recipients = await list_employees_with_marketplace_manage(db, org_id)
    title = 'Новая заявка с витрины'
    body = (
        f'«{listing_title}»: {quantity} {unit}. '
        f'Покупатель {buyer_name}, тел. {buyer_phone}. '
        'Свяжитесь вне системы (звонок / мессенджер).'
    )
    ids: list[UUID] = []
    for employee in recipients:
        db.add(
            Notification(
                id=uuid4(),
                employee_id=employee.id,
                type=NEW_MARKET_ORDER_TYPE,
                title=title[:200],
                body=body,
                link=SELLER_ORDERS_LINK,
                is_read=False,
            )
        )
        ids.append(employee.id)
    return ids


async def send_optional_telegram_new_market_order(
    notifier: object | None,
    db: AsyncSession,
    *,
    recipient_ids: list[UUID],
    listing_title: str,
    buyer_name: str,
    buyer_phone: str,
    quantity: Decimal,
    unit: str,
    web_base: str | None,
) -> None:
    """Best-effort Telegram duplicate; never raises to the order API."""
    if notifier is None or not getattr(notifier, 'enabled', False):
        return
    if not recipient_ids:
        return
    try:
        text = format_new_market_order_telegram_text(
            listing_title=listing_title,
            buyer_name=buyer_name,
            buyer_phone=buyer_phone,
            quantity=quantity,
            unit=unit,
            web_base=web_base,
        )
        for employee_id in recipient_ids:
            await notifier.notify_employee(employee_id, text, db)  # type: ignore[attr-defined]
    except Exception:
        logger.exception('Telegram new_market_order notify failed (order already saved)')
