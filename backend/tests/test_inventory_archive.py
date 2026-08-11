"""Safe archive / hard-delete / restore for inventory items."""

from __future__ import annotations

import uuid

import httpx
import pytest


def _unique(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def test_hard_delete_empty_item(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    name = _unique('empty-tmc')
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': name,
            'category': 'parts',
            'unit': 'шт',
            'current_stock': 0,
            'min_stock': 0,
            'total_capacity': 0,
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    # Opening balance may auto-create an operation — if so hard delete is blocked.
    listed_ops = client.get(
        f'/api/inventory/{item_id}/operations',
        headers=admin_headers,
    )
    assert listed_ops.status_code == 200
    ops = listed_ops.json()
    if ops:
        # Zero stock with history → archive only
        blocked = client.request(
            'DELETE',
            f'/api/inventory/{item_id}',
            headers=admin_headers,
            json={'reason': 'попытка удалить с историей'},
        )
        assert blocked.status_code == 409, blocked.text
        archived = client.post(
            f'/api/inventory/{item_id}/archive',
            headers=admin_headers,
            json={'reason': 'архив после создания с нулём'},
        )
        assert archived.status_code == 200, archived.text
        assert archived.json()['is_active'] is False
        return

    deleted = client.request(
        'DELETE',
        f'/api/inventory/{item_id}',
        headers=admin_headers,
        json={'reason': 'тестовое удаление пустой позиции'},
    )
    assert deleted.status_code == 204, deleted.text
    missing = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert missing.status_code == 404


def test_archive_with_history_and_restore(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    name = _unique('hist-tmc')
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': name,
            'category': 'parts',
            'unit': 'шт',
            'current_stock': 0,
            'min_stock': 0,
            'total_capacity': 10,
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    income = client.post(
        '/api/inventory/operations',
        headers=admin_headers,
        json={
            'item_id': item_id,
            'type': 'income',
            'quantity': 5,
            'purpose': 'general',
            'reason': 'приход тест',
        },
    )
    assert income.status_code == 201, income.text

    # Stock > 0 blocks archive
    blocked = client.post(
        f'/api/inventory/{item_id}/archive',
        headers=admin_headers,
        json={'reason': 'ещё есть остаток'},
    )
    assert blocked.status_code == 409, blocked.text
    assert 'остатк' in blocked.json()['detail'].lower()

    expense = client.post(
        '/api/inventory/operations',
        headers=admin_headers,
        json={
            'item_id': item_id,
            'type': 'expense',
            'quantity': 5,
            'purpose': 'general',
            'reason': 'расход до нуля',
        },
    )
    assert expense.status_code == 201, expense.text

    hard = client.request(
        'DELETE',
        f'/api/inventory/{item_id}',
        headers=admin_headers,
        json={'reason': 'нельзя — есть история'},
    )
    assert hard.status_code == 409, hard.text

    archived = client.post(
        f'/api/inventory/{item_id}/archive',
        headers=admin_headers,
        json={'reason': 'архивируем с историей'},
    )
    assert archived.status_code == 200, archived.text
    body = archived.json()
    assert body['is_active'] is False
    assert body['archive_reason'] == 'архивируем с историей'
    assert body.get('archived_at')

    active_list = client.get('/api/inventory', headers=admin_headers, params={'status': 'active'})
    assert active_list.status_code == 200
    assert all(row['id'] != item_id for row in active_list.json())

    archived_list = client.get(
        '/api/inventory', headers=admin_headers, params={'status': 'archived'}
    )
    assert archived_list.status_code == 200
    assert any(row['id'] == item_id for row in archived_list.json())

    ops = client.get(f'/api/inventory/{item_id}/operations', headers=admin_headers)
    assert ops.status_code == 200
    assert len(ops.json()) >= 1

    restored = client.post(
        f'/api/inventory/{item_id}/restore',
        headers=admin_headers,
        json={},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()['is_active'] is True
    # History of archive reason kept
    assert restored.json().get('archive_reason') == 'архивируем с историей'


def test_manager_without_delete_permission_forbidden(
    client: httpx.Client,
    manager_headers: dict[str, str],
    admin_headers: dict[str, str],
) -> None:
    name = _unique('mgr-tmc')
    created = client.post(
        '/api/inventory',
        headers=admin_headers,
        json={
            'name': name,
            'category': 'parts',
            'unit': 'шт',
            'current_stock': 0,
            'min_stock': 0,
            'total_capacity': 0,
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    denied = client.post(
        f'/api/inventory/{item_id}/archive',
        headers=manager_headers,
        json={'reason': 'менеджер без права'},
    )
    assert denied.status_code == 403, denied.text
