"""Inventory stock recalculation and backdated operations."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import httpx
import pytest

from app.models.inventory import InventoryOperationType
from app.services.inventory import _operation_delta


def test_operation_delta_signs() -> None:
    assert _operation_delta(InventoryOperationType.income, Decimal('10')) == Decimal('10')
    assert _operation_delta(InventoryOperationType.expense, Decimal('4')) == Decimal('-4')


# Keep live API scenarios below; pure delta covered also in test_inventory_stock_repair.py


def _create_item(client: httpx.Client, headers: dict[str, str], *, stock: float = 0) -> str:
    from uuid import uuid4

    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Тест ТМЦ {uuid4().hex[:8]}',
            'category': 'other',
            'unit': 'л',
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 1000,
        },
    )
    assert response.status_code == 201, response.text
    return str(response.json()['id'])


def _create_operation(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    item_id: str,
    op_type: str,
    quantity: float,
    op_date: str | None = None,
    purpose: str | None = None,
    reason: str | None = None,
) -> dict:
    payload: dict = {
        'item_id': item_id,
        'type': op_type,
        'quantity': quantity,
    }
    if op_date is not None:
        payload['date'] = op_date
    if purpose is not None:
        payload['purpose'] = purpose
    if reason is not None:
        payload['reason'] = reason
    response = client.post('/api/inventory/operations', headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_backdated_expense_recalculates_stock_after(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=100)
    today = date.today()
    earlier = (today - timedelta(days=5)).isoformat()
    later = (today - timedelta(days=2)).isoformat()

    first = _create_operation(
        client,
        manager_headers,
        item_id=item_id,
        op_type='expense',
        quantity=20,
        op_date=later,
    )
    assert float(first['stock_after']) == 80

    backdated = _create_operation(
        client,
        manager_headers,
        item_id=item_id,
        op_type='expense',
        quantity=30,
        op_date=earlier,
    )
    assert float(backdated['stock_after']) == 70

    item = client.get(f'/api/inventory/{item_id}', headers=manager_headers)
    assert item.status_code == 200, item.text
    assert float(item.json()['current_stock']) == 50

    history = client.get(
        f'/api/inventory/{item_id}/operations',
        headers=manager_headers,
        params={'limit': 10, 'exclude_opening': False},
    )
    assert history.status_code == 200, history.text
    rows = history.json()
    assert len(rows) >= 3
    by_date = sorted(rows, key=lambda row: (row['date'], row['id']))
    assert float(by_date[-1]['stock_after']) == 50
    assert float(by_date[-2]['stock_after']) == 70
    assert float(by_date[0]['stock_after']) == 100


def test_future_operation_date_rejected(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=50)
    future = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        '/api/inventory/operations',
        headers=manager_headers,
        json={
            'item_id': item_id,
            'type': 'expense',
            'quantity': 1,
            'date': future,
            'reason': 'test',
        },
    )
    assert response.status_code == 422, response.text


def test_item_operations_endpoint_limits_results(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=0)
    for qty in (5, 4, 3, 2, 1):
        _create_operation(
            client,
            manager_headers,
            item_id=item_id,
            op_type='income',
            quantity=qty,
        )

    limited = client.get(
        f'/api/inventory/{item_id}/operations',
        headers=manager_headers,
        params={'limit': 3},
    )
    assert limited.status_code == 200, limited.text
    assert len(limited.json()) == 3


def test_adjustment_requires_reason(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=40)
    response = client.post(
        '/api/inventory/operations',
        headers=manager_headers,
        json={
            'item_id': item_id,
            'type': 'income',
            'quantity': 5,
            'purpose': 'adjustment',
        },
    )
    assert response.status_code == 400, response.text


def test_adjustment_up_and_down_updates_stock(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=100)

    up = _create_operation(
        client,
        manager_headers,
        item_id=item_id,
        op_type='income',
        quantity=7,
        purpose='adjustment',
        reason='Инвентаризация: нашли лишнее',
    )
    assert float(up['stock_after']) == 107
    assert up['purpose'] == 'adjustment'

    down = _create_operation(
        client,
        manager_headers,
        item_id=item_id,
        op_type='expense',
        quantity=12,
        purpose='adjustment',
        reason='Инвентаризация: недостача',
    )
    assert float(down['stock_after']) == 95

    item = client.get(f'/api/inventory/{item_id}', headers=manager_headers)
    assert item.status_code == 200, item.text
    assert float(item.json()['current_stock']) == 95

    history = client.get(
        f'/api/inventory/{item_id}/operations',
        headers=manager_headers,
        params={'limit': 20, 'exclude_opening': False},
    )
    assert history.status_code == 200, history.text
    purposes = {row['purpose'] for row in history.json()}
    assert 'opening' in purposes
    assert 'adjustment' in purposes


def test_adjustment_down_blocked_when_insufficient(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, manager_headers, stock=5)
    response = client.post(
        '/api/inventory/operations',
        headers=manager_headers,
        json={
            'item_id': item_id,
            'type': 'expense',
            'quantity': 10,
            'purpose': 'adjustment',
            'reason': 'Попытка уйти в минус',
        },
    )
    assert response.status_code == 400, response.text

    item = client.get(f'/api/inventory/{item_id}', headers=manager_headers)
    assert item.status_code == 200, item.text
    assert float(item.json()['current_stock']) == 5
