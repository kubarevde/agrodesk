"""Messenger hub + SSE auth smoke tests."""

from __future__ import annotations

import asyncio
from uuid import uuid4

import httpx
import pytest

from app.services.messenger_hub import MessengerHub, build_event


@pytest.mark.asyncio
async def test_hub_delivers_to_subscriber() -> None:
    hub = MessengerHub()
    org_id = uuid4()
    emp_a = uuid4()
    emp_b = uuid4()
    queue = await hub.subscribe(org_id, emp_a)
    delivered = await hub.publish(
        org_id=org_id,
        employee_ids=[emp_a, emp_b],
        event=build_event('new_message', chat_id='c1'),
    )
    assert delivered == 1
    event = await asyncio.wait_for(queue.get(), timeout=1)
    assert event['type'] == 'new_message'
    assert event['chat_id'] == 'c1'
    await hub.unsubscribe(org_id, emp_a, queue)


def test_sse_requires_auth(client: httpx.Client) -> None:
    response = client.get('/api/messenger/events')
    assert response.status_code == 401, response.text


def test_sse_connects_with_token_query(
    admin_headers: dict[str, str],
) -> None:
    import os

    base = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')
    token = admin_headers['Authorization'].removeprefix('Bearer ').strip()
    # Dedicated client so the module-scoped fixture is not left with an open stream.
    with httpx.Client(base_url=base, timeout=httpx.Timeout(10.0, read=5.0)) as client:
        with client.stream(
            'GET',
            '/api/messenger/events',
            params={'token': token},
        ) as response:
            assert response.status_code == 200, response.text
            assert 'text/event-stream' in response.headers.get('content-type', '')
            buf = ''
            for part in response.iter_text():
                buf += part
                if 'connected' in buf or 'data:' in buf:
                    break
            assert 'connected' in buf or 'data:' in buf
