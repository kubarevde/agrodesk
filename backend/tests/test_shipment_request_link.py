"""Managerial link shipments.shipment_request_id ↔ done harvest requests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx


def _create_harvest_item(client: httpx.Client, headers: dict[str, str], stock: float = 300) -> dict:
    res = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Link harvest {uuid4().hex[:8]}',
            'category': 'harvest',
            'unit': 'кг',
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 10000,
            'crop_code': 'wheat',
            'crop_type': 'Пшеница',
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _complete_harvest_request(
    client: httpx.Client,
    headers: dict[str, str],
    item_id: str,
    quantity: float = 40,
) -> dict:
    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    created = client.post(
        '/api/shipment-requests',
        headers=headers,
        json={
            'customer_name': 'Link Buyer',
            'inventory_item_id': item_id,
            'quantity': quantity,
            'price': 15,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    req_id = created.json()['id']
    assert (
        client.post(f'/api/shipment-requests/{req_id}/start', headers=headers).status_code == 200
    )
    done = client.post(
        f'/api/shipment-requests/{req_id}/complete',
        headers=headers,
        json={},
    )
    assert done.status_code == 200, done.text
    return done.json()


def test_link_shipment_to_done_harvest_request(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_harvest_item(client, admin_headers)
    done = _complete_harvest_request(client, admin_headers, item['id'], quantity=40)

    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_code': 'wheat',
            'crop_type': 'Пшеница',
            'quantity_kg': 40,
            'destination': 'Элеватор',
            'price_per_kg': 15,
            'shipment_request_id': done['id'],
        },
    )
    assert shipment.status_code == 201, shipment.text
    body = shipment.json()
    assert body['shipment_request_id'] == done['id']

    listed = client.get(
        '/api/shipments',
        headers=admin_headers,
        params={'shipment_request_id': done['id']},
    )
    assert listed.status_code == 200
    assert any(row['id'] == body['id'] for row in listed.json())


def test_reject_link_to_inventory_kind_request(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    fuel = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': f'Link fuel {uuid4().hex[:8]}',
            'category': 'fuel',
            'unit': 'л',
            'current_stock': 100,
            'min_stock': 0,
            'total_capacity': 500,
        },
    )
    assert fuel.status_code == 201, fuel.text
    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    created = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Fuel Buyer',
            'inventory_item_id': fuel.json()['id'],
            'quantity': 5,
            'price': 10,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    req_id = created.json()['id']
    assert (
        client.post(f'/api/shipment-requests/{req_id}/start', headers=admin_headers).status_code
        == 200
    )
    assert (
        client.post(
            f'/api/shipment-requests/{req_id}/complete',
            headers=admin_headers,
            json={},
        ).status_code
        == 200
    )

    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_code': 'wheat',
            'crop_type': 'Пшеница',
            'quantity_kg': 5,
            'destination': 'Тест',
            'price_per_kg': 10,
            'shipment_request_id': req_id,
        },
    )
    assert shipment.status_code == 400, shipment.text


def test_reject_link_to_open_harvest_request(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    item = _create_harvest_item(client, admin_headers)
    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    created = client.post(
        '/api/shipment-requests',
        headers=admin_headers,
        json={
            'customer_name': 'Open Buyer',
            'inventory_item_id': item['id'],
            'quantity': 10,
            'price': 12,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()['status'] == 'new'

    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_code': 'wheat',
            'crop_type': 'Пшеница',
            'quantity_kg': 10,
            'destination': 'Тест',
            'price_per_kg': 12,
            'shipment_request_id': created.json()['id'],
        },
    )
    assert shipment.status_code == 400, shipment.text


def test_shipment_without_request_still_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    shipment = client.post(
        '/api/shipments',
        headers=admin_headers,
        json={
            'date': datetime.now(timezone.utc).date().isoformat(),
            'crop_code': 'wheat',
            'crop_type': 'Пшеница',
            'quantity_kg': 25,
            'destination': 'Без заявки',
            'price_per_kg': 14,
        },
    )
    assert shipment.status_code == 201, shipment.text
    assert shipment.json().get('shipment_request_id') is None
