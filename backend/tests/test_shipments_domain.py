"""Domain boundary: crop shipments vs warehouse / shipment_requests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx


def _create_item(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    category: str,
    crop_code: str | None = None,
    stock: float = 100,
) -> dict:
    body: dict = {
        'name': f'Domain {category} {uuid4().hex[:8]}',
        'category': category,
        'unit': 'кг',
        'current_stock': stock,
        'min_stock': 0,
        'total_capacity': 10000,
    }
    if crop_code is not None:
        body['crop_code'] = crop_code
    item = client.post('/api/inventory', headers=headers, json=body)
    assert item.status_code == 201, item.text
    return item.json()


def _complete_request(
    client: httpx.Client,
    headers: dict[str, str],
    item_id: str,
) -> dict:
    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    created = client.post(
        '/api/shipment-requests',
        headers=headers,
        json={
            'customer_name': 'Domain Buyer',
            'inventory_item_id': item_id,
            'quantity': 2,
            'price': 10,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    req = created.json()
    req_id = req['id']
    assert (
        client.post(f'/api/shipment-requests/{req_id}/start', headers=headers).status_code
        == 200
    )
    done = client.post(
        f'/api/shipment-requests/{req_id}/complete',
        headers=headers,
        json={},
    )
    assert done.status_code == 200, done.text
    return done.json()


def test_complete_request_does_not_insert_crop_shipment(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, category='other')
    before = client.get('/api/shipments', headers=admin_headers)
    assert before.status_code == 200
    before_ids = {row['id'] for row in before.json()}

    done = _complete_request(client, admin_headers, item['id'])
    assert done['inventory_operation_id']
    assert done.get('kind') == 'inventory'
    assert done.get('is_harvest') is False

    after = client.get('/api/shipments', headers=admin_headers)
    assert after.status_code == 200
    assert {row['id'] for row in after.json()} == before_ids


def test_fuel_request_does_not_affect_shipments_list(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """GSM outbound must not appear as crop harvest."""
    fuel = _create_item(client, admin_headers, category='fuel', stock=500)
    before = client.get('/api/shipments', headers=admin_headers)
    assert before.status_code == 200
    before_count = len(before.json())

    done = _complete_request(client, admin_headers, fuel['id'])
    assert done['kind'] == 'inventory'

    after = client.get('/api/shipments', headers=admin_headers)
    assert after.status_code == 200
    assert len(after.json()) == before_count


def test_harvest_inventory_item_and_request_without_crop_shipment(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    payload = _create_item(
        client, admin_headers, category='harvest', crop_code='wheat', stock=500
    )
    assert payload['is_harvest'] is True
    assert payload.get('crop_code') == 'wheat'

    before = client.get('/api/shipments', headers=admin_headers)
    assert before.status_code == 200
    before_ids = {row['id'] for row in before.json()}

    done = _complete_request(client, admin_headers, payload['id'])
    assert done['inventory_operation_id']
    assert done['kind'] == 'harvest'
    assert done['is_harvest'] is True

    after = client.get('/api/shipments', headers=admin_headers)
    assert after.status_code == 200
    assert {row['id'] for row in after.json()} == before_ids

    by_kind = client.get(
        '/api/shipment-requests',
        headers=admin_headers,
        params={'kind': 'harvest', 'status': 'done'},
    )
    assert by_kind.status_code == 200
    assert any(row['id'] == done['id'] for row in by_kind.json())

    materials_only = client.get(
        '/api/shipment-requests',
        headers=admin_headers,
        params={'kind': 'inventory', 'status': 'done'},
    )
    assert materials_only.status_code == 200
    assert all(row['id'] != done['id'] for row in materials_only.json())


def test_optional_shipment_request_link_on_crop_shipment(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, category='harvest', crop_code='barley')
    done = _complete_request(client, admin_headers, item['id'])
    req_id = done['id']

    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_type': 'Ячмень',
            'quantity_kg': 100,
            'destination': 'Элеватор',
            'price_per_kg': 12,
            'shipment_request_id': req_id,
        },
    )
    assert shipment.status_code == 201, shipment.text
    assert shipment.json().get('shipment_request_id') == req_id


def test_crop_shipment_create_does_not_touch_inventory(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_item(client, admin_headers, category='fuel', stock=200)
    stock_before = item['current_stock']

    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_type': 'Пшеница',
            'quantity_kg': 50,
            'price_per_kg': 15,
        },
    )
    assert shipment.status_code == 201, shipment.text

    listed = client.get('/api/inventory', headers=admin_headers, params={'is_active': True})
    assert listed.status_code == 200
    match = next(row for row in listed.json() if row['id'] == item['id'])
    assert float(match['current_stock']) == float(stock_before)
