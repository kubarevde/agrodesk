"""Outbound Telegram helpers for AgroDesk messenger (optional).

Additive module — does not touch shift open/close handlers.
Used when the bot process needs to format/send a messenger ping; the API
also notifies via backend TelegramNotifier when TELEGRAM_BOT_TOKEN is set.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


def format_new_message_notice(
    *,
    sender_name: str,
    body: str,
    chat_id: str | UUID,
    web_base: str | None = None,
) -> str:
    preview = (body or '').strip()
    if len(preview) > 200:
        preview = f'{preview[:197]}…'
    path = f'/messenger/{chat_id}'
    link = f'{web_base.rstrip("/")}{path}' if web_base else path
    lines = [
        'У вас новое сообщение в AgroDesk',
        f'От: {sender_name}',
    ]
    if preview:
        lines.append(preview)
    lines.append(f'Открыть: {link}')
    return '\n'.join(lines)


async def send_messenger_notice(
    bot: Any | None,
    *,
    telegram_id: int | None,
    sender_name: str,
    body: str,
    chat_id: str | UUID,
    web_base: str | None = None,
) -> bool:
    """Send messenger notice if bot and telegram_id are present; otherwise no-op."""
    if bot is None or telegram_id is None:
        return False
    text = format_new_message_notice(
        sender_name=sender_name,
        body=body,
        chat_id=chat_id,
        web_base=web_base,
    )
    try:
        await bot.send_message(chat_id=int(telegram_id), text=text)
        return True
    except Exception:
        logger.exception('messenger_notify failed telegram_id=%s', telegram_id)
        return False
