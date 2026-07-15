"""Outbound Telegram notifications via Bot API."""

from __future__ import annotations

import logging
from uuid import UUID

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeRole

logger = logging.getLogger(__name__)


class TelegramNotifier:
    def __init__(self, bot_token: str | None) -> None:
        token = (bot_token or '').strip()
        self.bot_token: str | None = token or None

    @property
    def enabled(self) -> bool:
        return self.bot_token is not None

    async def send(self, chat_id: int, text: str) -> bool:
        if not self.enabled:
            return False

        url = f'https://api.telegram.org/bot{self.bot_token}/sendMessage'
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    json={
                        'chat_id': chat_id,
                        'text': text,
                        'parse_mode': 'HTML',
                    },
                )
                response.raise_for_status()
                payload = response.json()
                if not payload.get('ok'):
                    logger.warning(
                        'Telegram sendMessage not ok for chat_id=%s: %s',
                        chat_id,
                        payload,
                    )
                    return False
                return True
        except Exception:
            logger.exception('Telegram sendMessage failed for chat_id=%s', chat_id)
            return False

    async def notify_employee(
        self,
        employee_id: UUID,
        message: str,
        db: AsyncSession,
    ) -> bool:
        if not self.enabled:
            return False

        employee = await db.get(Employee, employee_id)
        if employee is None or not employee.is_active or employee.telegram_id is None:
            return False

        return await self.send(int(employee.telegram_id), message)

    async def notify_managers(self, message: str, db: AsyncSession) -> int:
        if not self.enabled:
            return 0

        result = await db.execute(
            select(Employee).where(
                Employee.is_active.is_(True),
                Employee.telegram_id.is_not(None),
                or_(
                    Employee.role == EmployeeRole.manager,
                    Employee.role == EmployeeRole.admin,
                ),
            )
        )
        managers = result.scalars().all()
        sent = 0
        for manager in managers:
            if manager.telegram_id is None:
                continue
            ok = await self.send(int(manager.telegram_id), message)
            if ok:
                sent += 1
        return sent
