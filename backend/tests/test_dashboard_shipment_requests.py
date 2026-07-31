"""Dashboard shipment_requests_summary aggregates."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest

from app.services.dashboard import (
    SHIPMENT_REQUESTS_UPCOMING_DAYS,
    fetch_shipment_requests_summary,
)


def _create_item(client: httpx.Client, headers: dict[str, str], *, stock: float = 100) -> str:
    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Dash SR {uuid4().hex[:8]}',
            'category': 'other',
            'unit': 'кг',
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 10000,
        },
    )
    assert response.status_code == 201, response.text
    return str(response.json()['id'])


def _create_request(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    item_id: str,
    planned: datetime,
    priority: str = 'normal',
    status_after: str | None = None,
) -> dict:
    response = client.post(
        '/api/shipment-requests',
        headers=headers,
        json={
            'customer_name': 'ООО Dash',
            'inventory_item_id': item_id,
            'quantity': 1,
            'price': 10,
            'planned_at': planned.isoformat(),
            'priority': priority,
        },
    )
    assert response.status_code == 201, response.text
    row = response.json()
    if status_after == 'in_progress':
        started = client.post(
            f"/api/shipment-requests/{row['id']}/start",
            headers=headers,
        )
        assert started.status_code == 200, started.text
        row = started.json()
    elif status_after == 'cancelled':
        cancelled = client.post(
            f"/api/shipment-requests/{row['id']}/cancel",
            headers=headers,
            json={'reason': 'Отмена для dashboard summary'},
        )
        assert cancelled.status_code == 200, cancelled.text
        row = cancelled.json()
    return row


@pytest.mark.asyncio
async def test_fetch_shipment_requests_summary_counts(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    from uuid import UUID

    today = date.today()
    item_id = _create_item(client, admin_headers)

    def at_day(offset: int) -> datetime:
        return datetime(
            today.year,
            today.month,
            today.day,
            12,
            0,
            tzinfo=timezone.utc,
        ) + timedelta(days=offset)

    _create_request(client, admin_headers, item_id=item_id, planned=at_day(0))
    _create_request(client, admin_headers, item_id=item_id, planned=at_day(2))
    _create_request(
        client,
        admin_headers,
        item_id=item_id,
        planned=at_day(-1),
        priority='urgent',
    )
    _create_request(
        client,
        admin_headers,
        item_id=item_id,
        planned=at_day(1),
        priority='urgent',
        status_after='cancelled',
    )

    summary = await fetch_shipment_requests_summary(today, UUID(demo_org_id))
    assert summary.today >= 1
    assert summary.upcoming >= 1
    assert summary.overdue >= 1
    assert summary.urgent >= 1
    assert SHIPMENT_REQUESTS_UPCOMING_DAYS >= 3


def test_dashboard_api_includes_shipment_requests_summary(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    response = client.get('/api/dashboard/stats', headers=admin_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert 'shipment_requests_summary' in body
    summary = body['shipment_requests_summary']
    for key in ('today', 'upcoming', 'overdue', 'urgent'):
        assert key in summary
        assert isinstance(summary[key], int)
        assert summary[key] >= 0
