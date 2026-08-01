"""Telegram notifier stays optional when bot token is unset."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.services.telegram_notify import TelegramNotifier, format_messenger_telegram_text, format_new_market_order_telegram_text


def test_format_messenger_telegram_text() -> None:
    chat_id = uuid4()
    text = format_messenger_telegram_text(
        sender_name='Петров',
        body='Здравствуйте',
        chat_id=chat_id,
        web_base='http://localhost:5173',
    )
    assert 'У вас новое сообщение в AgroDesk' in text
    assert 'Петров' in text
    assert f'http://localhost:5173/messenger/{chat_id}' in text


def test_format_new_market_order_telegram_text_optional() -> None:
    text = format_new_market_order_telegram_text(
        listing_title='Урожай',
        buyer_name='Клиент',
        buyer_phone='+7111',
        quantity='5',
        unit='т',
    )
    assert '/seller-market/orders' in text
    assert 'Клиент' in text


@pytest.mark.asyncio
async def test_notifier_disabled_without_token() -> None:
    notifier = TelegramNotifier(None)
    assert notifier.enabled is False
    assert await notifier.send(1, 'hi') is False
    # db unused when disabled — pass a sentinel object
    assert await notifier.notify_employee(uuid4(), 'hi', db=object()) is False  # type: ignore[arg-type]
