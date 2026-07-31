"""Unit tests for optional messenger Telegram notify helper (bot package)."""

from __future__ import annotations

import pytest

from app.services.messenger_notify import format_new_message_notice, send_messenger_notice


def test_format_new_message_notice_includes_deep_link() -> None:
    text = format_new_message_notice(
        sender_name='Иванов',
        body='Привет',
        chat_id='11111111-1111-1111-1111-111111111111',
        web_base='https://app.example',
    )
    assert 'У вас новое сообщение в AgroDesk' in text
    assert 'Иванов' in text
    assert 'Привет' in text
    assert 'https://app.example/messenger/11111111-1111-1111-1111-111111111111' in text


@pytest.mark.asyncio
async def test_send_messenger_notice_noop_without_bot() -> None:
    ok = await send_messenger_notice(
        None,
        telegram_id=123,
        sender_name='A',
        body='x',
        chat_id='c',
    )
    assert ok is False


@pytest.mark.asyncio
async def test_send_messenger_notice_noop_without_telegram_id() -> None:
    class DummyBot:
        async def send_message(self, **kwargs):  # noqa: ANN003
            raise AssertionError('should not send')

    ok = await send_messenger_notice(
        DummyBot(),
        telegram_id=None,
        sender_name='A',
        body='x',
        chat_id='c',
    )
    assert ok is False
