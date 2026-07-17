"""Repair journal API tests (extended equipment_maintenance + checklist)."""

from __future__ import annotations

from datetime import date

import httpx


def _first_equipment_id(client: httpx.Client, headers: dict[str, str]) -> str:
    listed = client.get('/api/equipment', headers=headers)
    assert listed.status_code == 200, listed.text
    items = listed.json()
    assert items, 'Need at least one equipment in test DB'
    return str(items[0]['id'])


def _first_implement_id(client: httpx.Client, headers: dict[str, str]) -> str | None:
    listed = client.get('/api/implements', headers=headers)
    if listed.status_code != 200:
        return None
    items = listed.json()
    if not items:
        return None
    return str(items[0]['id'])


def test_create_repair_with_checklist_and_complete(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    equipment_id = _first_equipment_id(client, manager_headers)
    created = client.post(
        '/api/equipment-maintenance',
        headers=manager_headers,
        json={
            'equipment_id': equipment_id,
            'date': date.today().isoformat(),
            'type': 'Ремонт',
            'description': 'Тестовая поломка',
            'priority': 'urgent',
            'status': 'in_progress',
            'checklist_items': [
                {'item_type': 'buy', 'description': 'Фильтр масла'},
                {'item_type': 'buy', 'description': 'Прокладка', 'cost': 500},
                {'item_type': 'repair', 'description': 'Заменить фильтр'},
            ],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    repair_id = body['id']
    assert body['status'] == 'in_progress'
    assert body['checklist_total'] == 3
    assert body['equipment_id'] == equipment_id
    items = body['checklist_items']
    assert len(items) == 3

    done1 = client.patch(
        f'/api/equipment-maintenance/checklist-items/{items[0]["id"]}',
        headers=manager_headers,
        json={'is_done': True},
    )
    assert done1.status_code == 200, done1.text
    assert done1.json()['is_done'] is True

    done2 = client.patch(
        f'/api/equipment-maintenance/checklist-items/{items[1]["id"]}',
        headers=manager_headers,
        json={'is_done': True},
    )
    assert done2.status_code == 200, done2.text

    # Completing without date_returned must fail
    bad = client.patch(
        f'/api/equipment-maintenance/{repair_id}',
        headers=manager_headers,
        json={'status': 'done'},
    )
    assert bad.status_code == 422, bad.text

    finished = client.patch(
        f'/api/equipment-maintenance/{repair_id}',
        headers=manager_headers,
        json={
            'status': 'done',
            'date_returned': date.today().isoformat(),
            'create_expense': True,
        },
    )
    assert finished.status_code == 200, finished.text
    assert finished.json()['status'] == 'done'
    assert finished.json()['date_returned'] == date.today().isoformat()

    active = client.get('/api/equipment-maintenance/active-count', headers=manager_headers)
    assert active.status_code == 200, active.text
    assert 'count' in active.json()


def test_repair_requires_equipment_or_implement(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    bad = client.post(
        '/api/equipment-maintenance',
        headers=manager_headers,
        json={
            'date': date.today().isoformat(),
            'type': 'Ремонт',
            'description': 'без актива',
        },
    )
    assert bad.status_code == 422, bad.text

    implement_id = _first_implement_id(client, manager_headers)
    if implement_id:
        ok = client.post(
            '/api/equipment-maintenance',
            headers=manager_headers,
            json={
                'implement_id': implement_id,
                'date': date.today().isoformat(),
                'type': 'Ремонт',
                'priority': 'normal',
                'checklist_items': [{'item_type': 'repair', 'description': 'Сварка'}],
            },
        )
        assert ok.status_code == 201, ok.text
        assert ok.json()['implement_id'] == implement_id
        assert ok.json()['equipment_id'] is None


def test_legacy_to_list_still_works(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    """Existing /api/equipment/{id}/maintenance endpoint remains readable."""
    equipment_id = _first_equipment_id(client, manager_headers)
    listed = client.get(f'/api/equipment/{equipment_id}/maintenance', headers=manager_headers)
    assert listed.status_code == 200, listed.text
    assert isinstance(listed.json(), list)
