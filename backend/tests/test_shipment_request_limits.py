"""Shipment request stock limit, assignee, cancel reason, crop filter."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import httpx


def _planned() -> str:
    return datetime.now(timezone.utc).isoformat()


def _create_item(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    stock: float,
    category: str = 'fuel',
    crop_code: str | None = None,
) -> dict:
    body: dict = {
        'name': f'SR stock {uuid4().hex[:8]}',
        'category': category,
        'unit': 'кг' if category == 'harvest' else 'л',
        'current_stock': stock,
        'min_stock': 0,
        'total_capacity': max(stock, 100),
    }
    if crop_code:
        body['crop_code'] = crop_code
    res = client.post('/api/inventory', headers=headers, json=body)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_request_rejects_over_stock(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, stock=5)
    res = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Buyer',
            'inventory_item_id': item['id'],
            'quantity': 6,
            'price': 10,
            'planned_at': _planned(),
            'priority': 'normal',
        },
    )
    assert res.status_code == 400, res.text
    assert 'доступно' in res.json().get('detail', '').lower()


def test_create_request_allows_equal_stock_and_assignee(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, stock=7)
    me = client.get('/api/auth/me', headers=admin_headers)
    assert me.status_code == 200
    assignee = me.json().get('id') or me.json().get('employee_id')
    assert assignee
    res = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Buyer OK',
            'inventory_item_id': item['id'],
            'quantity': 7,
            'price': 10,
            'planned_at': _planned(),
            'priority': 'normal',
            'assigned_to': assignee,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json().get('assigned_to') == assignee


def test_cancel_requires_reason(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, stock=3)
    created = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Cancel me',
            'inventory_item_id': item['id'],
            'quantity': 1,
            'price': 1,
            'planned_at': _planned(),
            'priority': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    req_id = created.json()['id']

    bare = client.post(f'/api/shipment-requests/{req_id}/cancel', headers=admin_headers)
    assert bare.status_code == 422, bare.text

    empty = client.post(
        f'/api/shipment-requests/{req_id}/cancel',
        headers=admin_headers,
        json={'reason': '  '},
    )
    assert empty.status_code == 400, empty.text

    ok = client.post(
        f'/api/shipment-requests/{req_id}/cancel',
        headers=admin_headers,
        json={'reason': 'Покупатель отказался'},
    )
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body['status'] == 'cancelled'
    assert body.get('cancel_reason') == 'Покупатель отказался'


def test_list_harvest_requests_filter_by_crop_code(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    wheat = _create_item(client, admin_headers, stock=100, category='harvest', crop_code='wheat')
    barley = _create_item(client, admin_headers, stock=100, category='harvest', crop_code='barley')
    for item, name in ((wheat, 'W'), (barley, 'B')):
        created = client.post(
            '/api/shipment-requests',
            headers=admin_headers,
            json={
                'customer_name': f'Crop {name}',
                'inventory_item_id': item['id'],
                'quantity': 1,
                'price': 1,
                'planned_at': _planned(),
                'priority': 'normal',
            },
        )
        assert created.status_code == 201, created.text
        req_id = created.json()['id']
        start = client.post(f'/api/shipment-requests/{req_id}/start', headers=admin_headers)
        assert start.status_code == 200, start.text
        done = client.post(
            f'/api/shipment-requests/{req_id}/complete',
            headers=admin_headers,
            json={},
        )
        assert done.status_code == 200, done.text

    only_wheat = client.get(
        '/api/shipment-requests',
        headers=admin_headers,
        params={'kind': 'harvest', 'status': 'done', 'crop_code': 'wheat'},
    )
    assert only_wheat.status_code == 200
    rows = only_wheat.json()
    assert rows
    assert all(row.get('crop_code') == 'wheat' for row in rows)
