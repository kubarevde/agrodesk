"""Harvest SKU outbound via the same shipment_requests flow."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx


def test_harvest_request_complete_decreases_stock(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Harvest outbound {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': 400,
            'min_stock': 0,
            'total_capacity': 10000,
            'crop_code': 'wheat',
        },
    )
    assert created.status_code == 201, created.text
    item = created.json()
    item_id = item['id']
    stock_before = float(item['current_stock'])

    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    req = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Harvest Buyer',
            'inventory_item_id': item_id,
            'quantity': 75,
            'price': 12,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert req.status_code == 201, req.text
    body = req.json()
    assert body['kind'] == 'harvest'
    assert body['is_harvest'] is True
    assert body['status'] == 'new'
    req_id = body['id']

    assert (
        client.post(f'/api/shipment-requests/{req_id}/start', headers=admin_headers).status_code
        == 200
    )
    done = client.post(
        f'/api/shipment-requests/{req_id}/complete',
        headers=admin_headers,
        json={},
    )
    assert done.status_code == 200, done.text
    done_body = done.json()
    assert done_body['status'] == 'done'
    assert done_body['inventory_operation_id']
    assert done_body['kind'] == 'harvest'

    stock = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert stock.status_code == 200
    assert float(stock.json()['current_stock']) == stock_before - 75

    # Crop shipments KPI table untouched
    shipments = client.get('/api/shipments', headers=admin_headers)
    assert shipments.status_code == 200
